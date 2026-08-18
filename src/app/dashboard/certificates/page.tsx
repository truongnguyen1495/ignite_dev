import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Chứng nhận"
      description="Chứng nhận hoàn thành từng cấp đào tạo, tải về hoặc chia sẻ."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
