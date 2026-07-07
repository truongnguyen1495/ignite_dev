import { BackLink } from "@/components/ui/back-link";
import { CreateStudentForm } from "./create-student-form";

export default function NewStudentPage() {
  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/admin/students">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm học viên</h1>
      </div>
      <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
        <CreateStudentForm />
      </div>
    </div>
  );
}
