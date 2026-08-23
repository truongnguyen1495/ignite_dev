import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EditVendorProfileForm } from "./edit-vendor-profile-form";
import { PauseVendorButton } from "./pause-vendor-button";

export default async function VendorProfilePage() {
  const { vendor: vendorSummary } = await requireVendorAccountAccess();
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorSummary.id } });

  return (
    <div className="space-y-6">
      <PageHeader title="Hồ sơ gian hàng" description="Thông tin công khai trên trang gian hàng của bạn." />

      <div className="max-w-xl space-y-6">
        <EditVendorProfileForm
          slug={vendor.slug}
          shopName={vendor.shopName}
          logoUrl={vendor.logoUrl}
          bio={vendor.bio}
          contactEmail={vendor.contactEmail}
          contactPhone={vendor.contactPhone}
          bankName={vendor.bankName}
          bankAccountNumber={vendor.bankAccountNumber}
          bankAccountHolder={vendor.bankAccountHolder}
        />

        <div className="flex items-center justify-between gap-4 rounded-xl border border-warning-border bg-warning-bg/40 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Tạm ngừng gian hàng</p>
            <p className="mt-1 text-xs text-muted">
              Ẩn toàn bộ sản phẩm khỏi khách &amp; học viên, tạm dừng nhận đơn mới. Bạn tự bật lại bất cứ lúc nào —
              khác với việc admin khoá gian hàng.
            </p>
          </div>
          <PauseVendorButton paused={!!vendor.pausedAt} />
        </div>
      </div>
    </div>
  );
}
