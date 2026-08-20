import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, PlayCircle, ExternalLink } from "lucide-react";
import { requireCourseLessonAccess, isSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/pricing";
import { YoutubeTrackedEmbed } from "@/components/youtube-tracked-embed";
import { LessonWatchProgressProvider } from "@/components/lesson-watch-progress-provider";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { BuyButton } from "@/components/buy-button";
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

  const [course, siblingLessons, completions, courseChapters, salesEnabled, settings, watchProgress] =
    await Promise.all([
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
      isSalesEnabled(),
      prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
      prisma.courseLessonWatchProgress.findUnique({
        where: { studentId_courseLessonId: { studentId: student.id, courseLessonId: lessonId } },
        select: { watchedSeconds: true },
      }),
    ]);

  // See Settings.lessonWatchThresholdPercent in schema.prisma — only
  // applies when the lesson actually has a video with a known duration;
  // missing either and the "Đánh dấu hoàn thành" button behaves exactly as
  // it did before this feature existed.
  const watchGateEnforced =
    !!(lesson.youtubeId && lesson.durationSeconds) && settings.enforceLessonWatchForHocVien;
  const initialWatchedSeconds = watchProgress?.watchedSeconds ?? 0;

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

  // Chapter numbers are always derived from list position, never stored —
  // see the comment on the CourseChapter model in schema.prisma.
  const chapterNumberById = new Map(courseChapters.map((c, i) => [c.id, i + 1]));
  const lessonChapterNumber = lesson.chapterId ? chapterNumberById.get(lesson.chapterId) : undefined;

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

  const trialVisibleCount = siblingLessons.filter((l) => l.visibleToGuest).length;
  const lockedCount = totalLessons - trialVisibleCount;
  const pricing = course ? getPricing(course) : { forSale: false as const };

  return (
    <LessonWatchProgressProvider
      lessonId={lesson.id}
      durationSeconds={lesson.durationSeconds}
      initialWatchedSeconds={initialWatchedSeconds}
    >
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
        {course && isTrial && salesEnabled && pricing.forSale && (
          <BuyButton
            kind="COURSE"
            itemId={course.id}
            label="Nâng cấp để mở khóa toàn bộ"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-danger-foreground transition-colors hover:opacity-90"
            details={{
              title: course.title,
              description: course.description,
              coverImageUrl: course.coverImageUrl,
              meta: `${totalLessons} bài học`,
              price: pricing.chargeAmount,
              originalPrice: pricing.originalPrice,
            }}
          />
        )}
      </div>

      {isTrial && (
        <p className="mt-4 rounded-lg border border-warning-border-strong bg-warning-bg px-3 py-2 text-xs text-warning">
          Bạn đang <span className="font-semibold">học thử</span> — xem được {trialVisibleCount}/{totalLessons} bài.{" "}
          {salesEnabled && pricing.forSale
            ? "Nâng cấp để mở toàn bộ khóa học."
            : "Cần được cấp quyền để xem toàn bộ khóa học."}
        </p>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="relative">
            {lesson.youtubeId ? (
              <YoutubeTrackedEmbed
                videoId={lesson.youtubeId}
                durationSeconds={lesson.durationSeconds}
                initialWatchedSeconds={initialWatchedSeconds}
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-faint-bg">
                <PlayCircle className="h-10 w-10 text-muted" />
              </div>
            )}
            {lessonChapterNumber && (
              <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                Chương {String(lessonChapterNumber).padStart(2, "0")}
              </span>
            )}
          </div>

          {lesson.youtubeId && (
            <a
              href={`https://www.youtube.com/watch?v=${lesson.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Xem trên YouTube
            </a>
          )}

          <div>
            {currentIndex >= 0 && (
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Bài {currentIndex + 1} / {totalLessons}
              </p>
            )}
            <h1 className="mt-1 text-xl font-semibold text-foreground">{lesson.title}</h1>
          </div>

          {lesson.content && (
            <CollapsibleSection title="Nội dung bài học">
              <div className="rounded-xl border border-border bg-background p-6">
                <LessonMarkdown content={lesson.content} />
              </div>
            </CollapsibleSection>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <MarkCompleteButton
              lessonId={lesson.id}
              completed={completedLessonIds.has(lesson.id)}
              enforced={watchGateEnforced}
              thresholdPercent={settings.lessonWatchThresholdPercent}
            />

            <div className="flex items-center gap-2">
              {prevLesson ? (
                <Link
                  href={`/dashboard/courses/${courseId}/lessons/${prevLesson.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-surface-hover"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Bài trước
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted/50">
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
                <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted/50">
                  Bài sau
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-background p-4">
            {course && (
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{course.title}</p>
            )}
            <p className="mt-1 text-sm text-muted">
              {completedLessonIds.size}/{totalLessons} bài đã hoàn thành
            </p>
            <div className="mt-4">
              <CourseLessonSidebar
                groups={sidebarGroups}
                showChapterHeadings={showChapterHeadings}
                lessonBasePath={`/dashboard/courses/${courseId}/lessons`}
                lockedMessage="Cần được cấp quyền để xem"
              />
            </div>
          </div>

          {course && isTrial && salesEnabled && pricing.forSale && lockedCount > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary-bg p-4 text-center">
              <p className="text-sm font-medium text-foreground">Mở khóa {lockedCount} bài còn lại</p>
              <p className="text-xs text-muted">Học trọn bộ {course.title}</p>
              <BuyButton
                kind="COURSE"
                itemId={course.id}
                label="Nâng cấp ngay"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                details={{
                  title: course.title,
                  description: course.description,
                  coverImageUrl: course.coverImageUrl,
                  meta: `${totalLessons} bài học`,
                  price: pricing.chargeAmount,
                  originalPrice: pricing.originalPrice,
                }}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
    </LessonWatchProgressProvider>
  );
}
