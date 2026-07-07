import { BackLink } from "@/components/ui/back-link";
import { CreateLessonForm } from "./create-lesson-form";

export default function NewLessonPage() {
  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/admin/lessons">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm bài học</h1>
      </div>
      <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
        <CreateLessonForm />
      </div>
    </div>
  );
}
