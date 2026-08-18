import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Quản lý Lead"
      description="Công cụ theo dõi khách hàng tiềm năng: ghi nhận, phân loại và nhắc lịch chăm sóc."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
