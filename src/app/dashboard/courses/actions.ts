"use server";

import { revalidatePath } from "next/cache";
import { requireCourseLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function markCourseLessonCompleteAction(lessonId: string) {
  const { student, lesson } = await requireCourseLessonAccess(lessonId);
  await prisma.courseLessonCompletion.upsert({
    where: { studentId_courseLessonId: { studentId: student.id, courseLessonId: lessonId } },
    create: { studentId: student.id, courseLessonId: lessonId },
    update: {},
  });
  revalidatePath(`/dashboard/courses/${lesson.courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard/courses");
}
