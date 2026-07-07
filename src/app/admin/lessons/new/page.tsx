import Link from "next/link";
import { CreateLessonForm } from "./create-lesson-form";

export default function NewLessonPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/lessons" className="text-sm text-zinc-500 hover:underline">
          ← Quay lại
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Thêm bài học</h1>
      </div>
      <CreateLessonForm />
    </div>
  );
}
