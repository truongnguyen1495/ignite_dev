import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CourseLessonForm } from "../course-lesson-form";

export default async function NewCourseLessonPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href={`/admin/courses/${courseId}`}>Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Thêm bài học — {course.title}
        </h1>
      </div>
      <Card padding="lg">
        <CourseLessonForm courseId={courseId} />
      </Card>
    </div>
  );
}
