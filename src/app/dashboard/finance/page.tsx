import { requireActiveStudent } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Same gate as every other member route — a placeholder must not be the one
  // page that answers to a logged-out visitor.
  await requireActiveStudent();
  return (
    <ComingSoon
      title="Thu chi"
      description="Sổ ghi các khoản thu và chi trong hoạt động kinh doanh của bạn."
      backHref="/dashboard"
      backLabel="Về trang chính"
    />
  );
}
