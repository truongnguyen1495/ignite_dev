import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Lead của đội nhóm"
      description="Lead do cả đội nhóm mang về, xem ai đang chăm sóc và tiến độ tới đâu."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
