import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CourseLessonForm } from "../course-lesson-form";

export default async function EditCourseLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== courseId) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href={`/admin/courses/${courseId}`}>Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{lesson.title}</h1>
      </div>
      <Card padding="lg">
        <CourseLessonForm
          courseId={courseId}
          lessonId={lesson.id}
          title={lesson.title}
          content={lesson.content}
          youtubeId={lesson.youtubeId}
          order={lesson.order}
        />
      </Card>
    </div>
  );
}
