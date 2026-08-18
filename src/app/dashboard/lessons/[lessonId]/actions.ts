"use server";

import { revalidatePath } from "next/cache";
import { requireLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// Level-lesson twin of the course-lesson actions in
// src/app/dashboard/courses/actions.ts. Kept separate rather than
// generalised: Lesson and CourseLesson are different tables with different
// access gates (requireLessonAccess re-checks grantedLevel fresh from the
// DB), and every write here goes through that gate.

/**
 * Persists accumulated watch time. Monotonic — a lower number than what's
 * already stored is ignored, so a reload or a second tab can never walk
 * progress backwards.
 *
 * Unlike its course counterpart this clamps to the lesson's real duration
 * before writing: these actions are reachable by direct POST, so an
 * untrusted `watchedSeconds` must never be able to buy its way past the
 * watch gate by claiming a number bigger than the video is long.
 */
export async function syncLessonWatchProgressAction(lessonId: string, watchedSeconds: number) {
  const { student, lesson } = await requireLessonAccess(lessonId);

  // No known duration means no percent can be computed and no gate applies
  // (see markLessonCompleteAction) — nothing worth storing.
  if (!lesson.durationSeconds || !Number.isFinite(watchedSeconds)) return;

  const capped = Math.min(Math.max(0, Math.floor(watchedSeconds)), lesson.durationSeconds);

  const existing = await prisma.lessonWatchProgress.findUnique({
    where: { studentId_lessonId: { studentId: student.id, lessonId } },
    select: { watchedSeconds: true },
  });
  if (existing && existing.watchedSeconds >= capped) return;

  await prisma.lessonWatchProgress.upsert({
    where: { studentId_lessonId: { studentId: student.id, lessonId } },
    create: { studentId: student.id, lessonId, watchedSeconds: capped },
    update: { watchedSeconds: capped },
  });
}

/**
 * Marks a level lesson done. Returns an error message to show inline, or
 * undefined on success.
 *
 * watchedSecondsHint is the client's live counter, persisted first so a
 * student who crosses the threshold and clicks immediately isn't rejected
 * just because the next periodic checkpoint hasn't landed yet.
 */
export async function markLessonCompleteAction(
  lessonId: string,
  watchedSecondsHint?: number
): Promise<string | undefined> {
  const { student, lesson } = await requireLessonAccess(lessonId);

  if (watchedSecondsHint != null) {
    await syncLessonWatchProgressAction(lessonId, watchedSecondsHint);
  }

  // Same gate contract as course lessons (Settings.lessonWatchThresholdPercent):
  // only a lesson that actually has a video AND a known duration can be
  // gated — missing either, this button behaves as if the feature weren't there.
  if (lesson.youtubeId && lesson.durationSeconds) {
    const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

    if (settings.enforceLessonWatchForHocVien) {
      const progress = await prisma.lessonWatchProgress.findUnique({
        where: { studentId_lessonId: { studentId: student.id, lessonId } },
        select: { watchedSeconds: true },
      });
      const watchedPercent = Math.round(((progress?.watchedSeconds ?? 0) / lesson.durationSeconds) * 100);
      if (watchedPercent < settings.lessonWatchThresholdPercent) {
        return `Cần xem đủ ${settings.lessonWatchThresholdPercent}% video mới đánh dấu hoàn thành được (đã xem ${watchedPercent}%).`;
      }
    }
  }

  await prisma.lessonCompletion.upsert({
    where: { studentId_lessonId: { studentId: student.id, lessonId } },
    create: { studentId: student.id, lessonId },
    update: {},
  });

  revalidatePath(`/dashboard/lessons/${lessonId}`);
  revalidatePath(`/dashboard/levels/${lesson.level}`);
  return undefined;
}
