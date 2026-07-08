import { BackLink } from "@/components/ui/back-link";
import { CreateLessonForm } from "./create-lesson-form";

export default function NewLessonPage() {
  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href="/admin/lessons">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm bài học</h1>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-8">
        <CreateLessonForm />
      </div>
    </div>
  );
}
