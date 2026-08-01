import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { requireGuestCourseLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { groupLessonsByChapter } from "@/lib/course-lessons";
import { CourseLessonSidebar, type SidebarGroup } from "@/components/course-lesson-sidebar";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flag.
export const dynamic = "force-dynamic";

export default async function GuestCourseLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { lesson } = await requireGuestCourseLessonAccess(lessonId);

  // Lists every lesson in the course so guests can see the full curriculum
  // shape — locked ones (visibleToGuest: false) render with a lock icon and
  // aren't linked, matching requireGuestCourseLessonAccess's gate.
  const [siblingLessons, courseChapters] = await Promise.all([
    prisma.courseLesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.courseChapter.findMany({
      where: { courseId: lesson.courseId },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  // A free course opens every lesson to guests (see requireGuestCourseLessonAccess
  // in src/lib/access.ts) — treat every sibling as visible instead of only
  // the ones opted into visibleToGuest.
  const isFullyOpen = lesson.course.isFree;
  const currentIndex = siblingLessons.findIndex((l) => l.id === lessonId);
  const totalLessons = siblingLessons.length;
  const prevCandidate = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
  const nextCandidate =
    currentIndex >= 0 && currentIndex < totalLessons - 1 ? siblingLessons[currentIndex + 1] : null;
  // Prev/next navigation only follows lessons a guest can actually open.
  const prevLesson = isFullyOpen || prevCandidate?.visibleToGuest ? prevCandidate : null;
  const nextLesson = isFullyOpen || nextCandidate?.visibleToGuest ? nextCandidate : null;

  // Same "only show headings when chapters are actually used" convention as
  // the student lesson page — see groupLessonsByChapter's own comment.
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
      locked: !isFullyOpen && !l.visibleToGuest,
      isCurrent: l.id === lessonId,
      number: siblingLessons.findIndex((s) => s.id === l.id) + 1,
    })),
  }));

  return (
    <div className="rounded-2xl border border-dark-border bg-dark-surface-raised p-4 sm:p-6">
      <Link
        href="/guest/courses"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-dark-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Link>

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

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dark-border pt-4">
            <div className="flex items-center gap-2">
              {prevLesson ? (
                <Link
                  href={`/guest/courses/${courseId}/lessons/${prevLesson.id}`}
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
                  href={`/guest/courses/${courseId}/lessons/${nextLesson.id}`}
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
            <p className="truncate text-xs font-medium uppercase tracking-wide text-dark-muted">
              {lesson.course.title}
            </p>
            <p className="mt-1 text-sm text-dark-muted">{totalLessons} bài học</p>
            <div className="mt-4">
              <CourseLessonSidebar
                groups={sidebarGroups}
                showChapterHeadings={showChapterHeadings}
                lessonBasePath={`/guest/courses/${courseId}/lessons`}
                lockedHref="/login"
                lockedMessage="Cần đăng nhập để xem"
                variant="dark"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
