import { redirect } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { requireSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { VENDOR_APPLICATION_STATUS_LABELS } from "@/lib/vendor";
import { formatDateVN } from "@/lib/date";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

// A gap the mockup's 12 screens never drew: a vendorOnly account whose
// application is PENDING/REJECTED has nowhere else in the app to land (see
// requireActiveStudent — it has no /dashboard, and requireVendorAccountAccess
// sends it here specifically for that reason). Kept in the spirit of
// ComingSoon — one plain status card, not a full dashboard shell.
export default async function VendorStatusPage() {
  const session = await requireSession();
  const vendor = await prisma.vendor.findUnique({ where: { userId: session.user.id } });
  if (!vendor) {
    redirect("/vendor/dang-ky");
  }
  if (vendor.applicationStatus === "APPROVED") {
    redirect("/vendor");
  }

  const isRejected = vendor.applicationStatus === "REJECTED";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
        <BrandLogo />
        <LogoutButton />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              isRejected ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
            }`}
          >
            {isRejected ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </span>
          <h1 className="mt-4 text-lg font-semibold text-foreground">
            {isRejected ? "Hồ sơ chưa được duyệt" : "Hồ sơ đang chờ duyệt"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Gian hàng <span className="font-medium text-foreground">{vendor.shopName}</span> —{" "}
            {VENDOR_APPLICATION_STATUS_LABELS[vendor.applicationStatus]}. Nộp ngày {formatDateVN(vendor.appliedAt)}.
          </p>
          {!isRejected && (
            <p className="mt-2 text-sm text-muted">Đội ngũ RapidX xét duyệt trong 1–2 ngày làm việc qua email.</p>
          )}
          {isRejected && vendor.reviewNote && (
            <div className="mt-4 w-full rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-left text-sm text-danger">
              <p className="font-medium">Lý do từ chối:</p>
              <p className="mt-1">{vendor.reviewNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
