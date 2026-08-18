import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Công cụ kinh doanh"
      description="Bộ công cụ hỗ trợ bán hàng: mẫu tin nhắn, kịch bản tư vấn, tài liệu giới thiệu."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
