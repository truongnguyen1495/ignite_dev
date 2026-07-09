import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { requireCourseLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { MarkCompleteButton } from "./mark-complete-button";

export default async function StudentCourseLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { student, lesson } = await requireCourseLessonAccess(lessonId);

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
  const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < totalLessons - 1 ? siblingLessons[currentIndex + 1] : null;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"
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
            <h1 className="mt-1 text-xl font-semibold text-white">{lesson.title}</h1>
          </div>

          {lesson.content && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
              <LessonMarkdown content={lesson.content} variant="dark" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-4">
            <MarkCompleteButton lessonId={lesson.id} completed={completedLessonIds.has(lesson.id)} />

            <div className="flex items-center gap-2">
              {prevLesson ? (
                <Link
                  href={`/dashboard/courses/${courseId}/lessons/${prevLesson.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Bài trước
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-600">
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
                <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-600">
                  Bài sau
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            {course && (
              <p className="truncate text-xs font-medium uppercase tracking-wide text-neutral-500">
                {course.title}
              </p>
            )}
            <p className="mt-1 text-sm text-neutral-300">
              {completedLessonIds.size}/{totalLessons} bài đã hoàn thành
            </p>
            <ul className="mt-4 space-y-1">
              {siblingLessons.map((l, index) => {
                const isCurrent = l.id === lessonId;
                const isDone = completedLessonIds.has(l.id);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/dashboard/courses/${courseId}/lessons/${l.id}`}
                      prefetch={false}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isCurrent ? "bg-primary/15 text-white" : "text-neutral-300 hover:bg-neutral-900"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                            isCurrent ? "border-primary text-primary" : "border-neutral-600 text-neutral-500"
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
