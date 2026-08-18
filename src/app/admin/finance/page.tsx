import { requireAdminPermission } from "@/lib/access";
import { ComingSoon } from "@/components/ui/coming-soon";

export default async function Page() {
  // Gated on MANAGE_ORDERS for now: these three are money features, and the
  // dedicated permissions they will need (MANAGE_AFFILIATE / MANAGE_FINANCE)
  // don't exist yet. Whoever already handles orders is the closest match.
  await requireAdminPermission("MANAGE_ORDERS");
  return (
    <ComingSoon
      title="Thu chi"
      description="Sổ thu chi của doanh nghiệp và báo cáo lãi lỗ."
      backHref="/admin"
      backLabel="Về tổng quan"
    />
  );
}
