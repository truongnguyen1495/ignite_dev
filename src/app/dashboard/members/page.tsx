import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Thành viên"
      description="Danh bạ thành viên trong hệ thống, tìm và kết nối với người cùng đội nhóm."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
