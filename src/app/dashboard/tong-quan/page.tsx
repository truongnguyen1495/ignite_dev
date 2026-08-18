import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Dashboard"
      description="Trang tổng quan gom điểm tuần, chuỗi check-in, nhiệm vụ hôm nay và tiến độ cấp vào một chỗ."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
