import { requireAdminPermission } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Gated on MANAGE_ORDERS for now: these three are money features, and the
  // dedicated permissions they will need (MANAGE_AFFILIATE / MANAGE_FINANCE)
  // don't exist yet. Whoever already handles orders is the closest match.
  await requireAdminPermission("MANAGE_ORDERS");
  return (
    <ComingSoon
      title="Doanh thu"
      description="Báo cáo doanh thu toàn hệ thống theo thời gian, sản phẩm và đội nhóm."
      backHref="/admin"
      backLabel="Về tổng quan"
    />
  );
}
