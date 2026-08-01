import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { requireCourseLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { groupLessonsByChapter } from "@/lib/course-lessons";
import { CourseLessonSidebar, type SidebarGroup } from "@/components/course-lesson-sidebar";
import { MarkCompleteButton } from "./mark-complete-button";

export default async function StudentCourseLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { student, lesson, accessLevel } = await requireCourseLessonAccess(lessonId);
  const isTrial = accessLevel === "trial";

  const [course, siblingLessons, completions, courseChapters] = await Promise.all([
    prisma.course.findUnique({ where: { id: lesson.courseId } }),
    prisma.courseLesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.courseLessonCompletion.findMany({
      where: { studentId: student.id, courseLesson: { courseId: lesson.courseId } },
      select: { courseLessonId: true },
    }),
    prisma.courseChapter.findMany({
      where: { courseId: lesson.courseId },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const completedLessonIds = new Set(completions.map((c) => c.courseLessonId));
  const currentIndex = siblingLessons.findIndex((l) => l.id === lessonId);
  const totalLessons = siblingLessons.length;
  // A trial ("học thử") student only navigates between the same lessons a
  // guest can reach (CourseLesson.visibleToGuest) — full access still walks
  // every lesson regardless, unchanged from before.
  const isReachable = (l: (typeof siblingLessons)[number]) => !isTrial || l.visibleToGuest;
  const prevCandidate = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
  const nextCandidate =
    currentIndex >= 0 && currentIndex < totalLessons - 1 ? siblingLessons[currentIndex + 1] : null;
  const prevLesson = prevCandidate && isReachable(prevCandidate) ? prevCandidate : null;
  const nextLesson = nextCandidate && isReachable(nextCandidate) ? nextCandidate : null;

  // Groups the sidebar list under its chapter headings, matching the admin
  // editor's merged outline — but only when the course actually uses
  // chapters (a single group means every lesson landed in it, i.e. no real
  // grouping to show), so a course with no chapters at all looks exactly
  // like it always has, no empty "Chưa xếp chương" heading added for it.
  const lessonGroups = groupLessonsByChapter(siblingLessons, courseChapters);
  const showChapterHeadings = lessonGroups.length > 1;
  const sidebarGroups: SidebarGroup[] = lessonGroups.map((group) => ({
    chapterId: group.chapterId,
    chapterTitle: group.chapterTitle,
    lessons: group.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      youtubeId: l.youtubeId,
      durationSeconds: l.durationSeconds,
      locked: isTrial && !l.visibleToGuest,
      isCurrent: l.id === lessonId,
      isDone: completedLessonIds.has(l.id),
      number: siblingLessons.findIndex((s) => s.id === l.id) + 1,
    })),
  }));

  return (
    <div className="rounded-2xl border border-dark-border bg-dark-surface-raised p-4 sm:p-6">
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-dark-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Link>

      {isTrial && (
        <p className="mt-4 rounded-lg border border-warning-border-strong bg-warning-bg px-3 py-2 text-xs text-warning">
          Bạn đang <span className="font-semibold">học thử</span> khóa học này — chỉ xem được một số bài,
          cần được cấp quyền đầy đủ để xem toàn bộ.
        </p>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {lesson.youtubeId && <YoutubeEmbed videoId={lesson.youtubeId} />}

          <div>
            {currentIndex >= 0 && (
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Bài {currentIndex + 1} / {totalLessons}
              </p>
            )}
            <h1 className="mt-1 text-xl font-semibold text-dark-foreground">{lesson.title}</h1>
          </div>

          {lesson.content && (
            <CollapsibleSection title="Nội dung bài học" variant="dark">
              <div className="rounded-xl border border-dark-border bg-dark-surface p-6">
                <LessonMarkdown content={lesson.content} variant="dark" />
              </div>
            </CollapsibleSection>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dark-border pt-4">
            <MarkCompleteButton lessonId={lesson.id} completed={completedLessonIds.has(lesson.id)} />

            <div className="flex items-center gap-2">
              {prevLesson ? (
                <Link
                  href={`/dashboard/courses/${courseId}/lessons/${prevLesson.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-lg border border-dark-border px-3 py-2 text-sm text-dark-muted hover:bg-dark-surface-raised"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Bài trước
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-dark-border px-3 py-2 text-sm text-dark-muted/50">
                  <ChevronLeft className="h-4 w-4" />
                  Bài trước
                </span>
              )}
              {nextLesson ? (
                <Link
                  href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  Bài sau
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-dark-border px-3 py-2 text-sm text-dark-muted/50">
                  Bài sau
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-dark-border bg-dark-surface p-4">
            {course && (
              <p className="truncate text-xs font-medium uppercase tracking-wide text-dark-muted">
                {course.title}
              </p>
            )}
            <p className="mt-1 text-sm text-dark-muted">
              {completedLessonIds.size}/{totalLessons} bài đã hoàn thành
            </p>
            <div className="mt-4">
              <CourseLessonSidebar
                groups={sidebarGroups}
                showChapterHeadings={showChapterHeadings}
                lessonBasePath={`/dashboard/courses/${courseId}/lessons`}
                lockedMessage="Cần được cấp quyền để xem"
                variant="dark"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
