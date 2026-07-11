import { requireAnyAdminPermission } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CreateStudentForm } from "./create-student-form";

export default async function NewStudentPage() {
  await requireAnyAdminPermission(["MANAGE_STUDENTS", "MANAGE_PROSPECTIVE_STUDENTS"]);
  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/admin/students">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm học viên</h1>
      </div>
      <Card className="max-w-xl">
        <CreateStudentForm />
      </Card>
    </div>
  );
}
