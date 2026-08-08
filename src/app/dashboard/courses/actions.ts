"use server";

import { revalidatePath } from "next/cache";
import { requireCourseLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// Called every ~5 real seconds of active playback by
// LessonWatchProgressProvider — a pure checkpoint, no completion logic
// here. Monotonic: never lets watchedSeconds go backwards (an out-of-order
// request — e.g. two tabs open on the same lesson — must never erase
// progress already recorded).
export async function syncLessonWatchProgressAction(lessonId: string, watchedSeconds: number) {
  const { student } = await requireCourseLessonAccess(lessonId);
  const existing = await prisma.courseLessonWatchProgress.findUnique({
    where: { studentId_courseLessonId: { studentId: student.id, courseLessonId: lessonId } },
    select: { watchedSeconds: true },
  });
  if (existing && existing.watchedSeconds >= watchedSeconds) {
    return;
  }

  await prisma.courseLessonWatchProgress.upsert({
    where: { studentId_courseLessonId: { studentId: student.id, courseLessonId: lessonId } },
    create: { studentId: student.id, courseLessonId: lessonId, watchedSeconds },
    update: { watchedSeconds },
  });
}

// watchedSecondsHint: the client's current live counter, persisted here
// before the gate check runs below — so a student who just crossed the
// threshold and immediately clicks the button isn't rejected just because
// the next scheduled periodic checkpoint (syncLessonWatchProgressAction)
// hasn't landed yet.
export async function markCourseLessonCompleteAction(
  lessonId: string,
  watchedSecondsHint?: number
): Promise<string | undefined> {
  const { student, lesson } = await requireCourseLessonAccess(lessonId);

  if (watchedSecondsHint != null) {
    await syncLessonWatchProgressAction(lessonId, watchedSecondsHint);
  }

  // Gate only applies when the lesson actually has a video with a known
  // duration (see the comment on Settings.lessonWatchThresholdPercent in
  // schema.prisma) — missing either and this behaves exactly as it did
  // before this feature existed, no gate at all.
  if (lesson.youtubeId && lesson.durationSeconds) {
    const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

    if (settings.enforceLessonWatchForHocVien) {
      const progress = await prisma.courseLessonWatchProgress.findUnique({
        where: { studentId_courseLessonId: { studentId: student.id, courseLessonId: lessonId } },
        select: { watchedSeconds: true },
      });
      const watchedPercent = Math.round(((progress?.watchedSeconds ?? 0) / lesson.durationSeconds) * 100);
      if (watchedPercent < settings.lessonWatchThresholdPercent) {
        return `Cần xem đủ ${settings.lessonWatchThresholdPercent}% video mới đánh dấu hoàn thành được (đã xem ${watchedPercent}%).`;
      }
    }
  }

  await prisma.courseLessonCompletion.upsert({
    where: { studentId_courseLessonId: { studentId: student.id, courseLessonId: lessonId } },
    create: { studentId: student.id, courseLessonId: lessonId },
    update: {},
  });
  revalidatePath(`/dashboard/courses/${lesson.courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard/courses");
  return undefined;
}
