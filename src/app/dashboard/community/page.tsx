import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Cộng đồng"
      description="Không gian chung để cả cộng đồng chia sẻ, hỏi đáp và lan toả câu chuyện thành công."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
