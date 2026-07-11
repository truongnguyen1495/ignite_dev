import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Lock } from "lucide-react";
import { requireCourseLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { MarkCompleteButton } from "./mark-complete-button";

export default async function StudentCourseLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { student, lesson, accessLevel } = await requireCourseLessonAccess(lessonId);
  const isTrial = accessLevel === "trial";

  const [course, siblingLessons, completions] = await Promise.all([
    prisma.course.findUnique({ where: { id: lesson.courseId } }),
    prisma.courseLesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.courseLessonCompletion.findMany({
      where: { studentId: student.id, courseLesson: { courseId: lesson.courseId } },
      select: { courseLessonId: true },
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
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning-bg px-3 py-2 text-xs text-warning">
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
            <ul className="mt-4 space-y-1">
              {siblingLessons.map((l, index) => {
                const isCurrent = l.id === lessonId;
                const isDone = completedLessonIds.has(l.id);

                if (isTrial && !l.visibleToGuest) {
                  return (
                    <li key={l.id}>
                      <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm text-dark-muted/50">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dark-border">
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 block">{l.title}</span>
                          <span className="mt-0.5 block text-xs italic text-dark-muted/40">
                            Cần được cấp quyền để xem
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={l.id}>
                    <Link
                      href={`/dashboard/courses/${courseId}/lessons/${l.id}`}
                      prefetch={false}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isCurrent ? "bg-primary/15 text-dark-foreground" : "text-dark-muted hover:bg-dark-surface-raised"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                            isCurrent ? "border-primary text-primary" : "border-dark-border text-dark-muted"
                          }`}
                        >
                          {index + 1}
                        </span>
                      )}
                      <span className="line-clamp-2">{l.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
