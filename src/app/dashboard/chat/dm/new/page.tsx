import { requireLeveledStudent, requireChatEnabled } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { StudentPicker } from "./student-picker";

export default async function NewDirectMessagePage() {
  await requireLeveledStudent();
  await requireChatEnabled("/dashboard");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/dashboard/chat/dm">Quay lại</BackLink>
        <div className="mt-2">
          <PageHeader title="Cuộc trò chuyện mới" description="Tìm học viên theo tên, username hoặc email." />
        </div>
      </div>
      <StudentPicker />
    </div>
  );
}
