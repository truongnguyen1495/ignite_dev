import Link from "next/link";
import { CreateStudentForm } from "./create-student-form";

export default function NewStudentPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/students" className="text-sm text-zinc-500 hover:underline">
          ← Quay lại
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Thêm học viên</h1>
      </div>
      <CreateStudentForm />
    </div>
  );
}
