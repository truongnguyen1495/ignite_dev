import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Checklist"
      description="Danh sách việc cần làm theo từng giai đoạn kinh doanh, tự đánh dấu tiến độ."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
