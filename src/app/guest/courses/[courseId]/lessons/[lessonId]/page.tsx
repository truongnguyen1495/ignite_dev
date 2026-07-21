import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { requireGuestCourseLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

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
  const siblingLessons = await prisma.courseLesson.findMany({
    where: { courseId: lesson.courseId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

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
            <ul className="mt-4 space-y-1">
              {siblingLessons.map((l, index) => {
                const isCurrent = l.id === lessonId;

                if (!isFullyOpen && !l.visibleToGuest) {
                  return (
                    <li key={l.id}>
                      <Link
                        href="/login"
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm text-dark-muted/50 transition-colors hover:bg-dark-surface-raised hover:text-dark-muted"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dark-border">
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 block">{l.title}</span>
                          <span className="mt-0.5 block text-xs italic text-dark-muted/40">
                            Cần đăng nhập để xem
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={l.id}>
                    <Link
                      href={`/guest/courses/${courseId}/lessons/${l.id}`}
                      prefetch={false}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isCurrent ? "bg-primary-bg-strong text-dark-foreground" : "text-dark-muted hover:bg-dark-surface-raised"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                          isCurrent ? "border-primary text-primary" : "border-dark-border text-dark-muted"
                        }`}
                      >
                        {index + 1}
                      </span>
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
