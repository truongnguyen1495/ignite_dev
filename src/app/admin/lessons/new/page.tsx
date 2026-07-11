import { requireAdminPermission } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CreateLessonForm } from "./create-lesson-form";

export default async function NewLessonPage() {
  await requireAdminPermission("MANAGE_LESSONS_QUIZZES");
  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href="/admin/lessons">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm bài học</h1>
      </div>
      <Card padding="lg">
        <CreateLessonForm />
      </Card>
    </div>
  );
}
