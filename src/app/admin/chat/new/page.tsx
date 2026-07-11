import { requireAdminPermission, requireChatEnabled } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { StudentPicker } from "./student-picker";

export default async function NewSupportThreadPage() {
  await requireAdminPermission("MANAGE_CHAT");
  await requireChatEnabled("/admin");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/admin/chat">Quay lại</BackLink>
        <div className="mt-2">
          <PageHeader title="Nhắn tin hỗ trợ mới" description="Tìm học viên theo tên, username hoặc email." />
        </div>
      </div>
      <StudentPicker />
    </div>
  );
}
