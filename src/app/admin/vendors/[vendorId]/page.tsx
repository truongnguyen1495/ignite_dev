import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Package, GraduationCap, BookOpen } from "lucide-react";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import { CommissionRateForm } from "./commission-rate-form";
import { HideListingButton } from "./hide-listing-button";
import { SuspendVendorControl } from "./suspend-vendor-control";
import { PendingVendorActions } from "../pending/pending-vendor-actions";

type ListingRow = {
  id: string;
  kind: "PRODUCT" | "COURSE" | "LIBRARY_ITEM";
  title: string;
  price: number;
  hidden: boolean;
  hiddenReason: string | null;
  soldCount: number;
};

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ vendorId: string }> }) {
  await requireAdminPermission("MANAGE_VENDORS");
  const { vendorId } = await params;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, include: { user: { select: { name: true } } } });
  if (!vendor) {
    notFound();
  }

  const paidFilter = { where: { order: { status: "PAID" as const } } };
  const [commissions, products, courses, libraryItems] = await prisma.$transaction([
    prisma.commission.findMany({ where: { vendorId }, select: { grossAmount: true, vendorAmount: true, status: true } }),
    prisma.product.findMany({
      where: { sellerId: vendorId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, price: true, hiddenFromGuest: true, vendorHiddenAt: true, vendorHiddenReason: true, _count: { select: { orderItems: paidFilter } } },
    }),
    prisma.course.findMany({
      where: { sellerId: vendorId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, price: true, hiddenFromGuest: true, vendorHiddenAt: true, vendorHiddenReason: true, _count: { select: { orderItems: paidFilter } } },
    }),
    prisma.libraryItem.findMany({
      where: { sellerId: vendorId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, price: true, visibleToStudents: true, vendorHiddenAt: true, vendorHiddenReason: true, _count: { select: { orderItems: paidFilter } } },
    }),
  ]);

  const activeCommissions = commissions.filter((c) => c.status !== "CANCELLED");
  const totalSales = activeCommissions.reduce((s, c) => s + c.grossAmount, 0);
  const vendorEarnedTotal = activeCommissions.reduce((s, c) => s + c.vendorAmount, 0);
  const platformCollected = totalSales - vendorEarnedTotal;
  const vendorPaid = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.vendorAmount, 0);
  const vendorPendingPayout = vendorEarnedTotal - vendorPaid;

  const listings: ListingRow[] = [
    ...products.map((p) => ({
      id: p.id,
      kind: "PRODUCT" as const,
      title: p.title,
      price: p.price,
      hidden: p.hiddenFromGuest,
      hiddenReason: p.vendorHiddenAt ? p.vendorHiddenReason : null,
      soldCount: p._count.orderItems,
    })),
    ...courses.map((c) => ({
      id: c.id,
      kind: "COURSE" as const,
      title: c.title,
      price: c.price,
      hidden: c.hiddenFromGuest,
      hiddenReason: c.vendorHiddenAt ? c.vendorHiddenReason : null,
      soldCount: c._count.orderItems,
    })),
    ...libraryItems.map((l) => ({
      id: l.id,
      kind: "LIBRARY_ITEM" as const,
      title: l.title,
      price: l.price,
      hidden: !l.visibleToStudents,
      hiddenReason: l.vendorHiddenAt ? l.vendorHiddenReason : null,
      soldCount: l._count.orderItems,
    })),
  ];
  const kindIcon = { PRODUCT: Package, COURSE: GraduationCap, LIBRARY_ITEM: BookOpen } as const;
  const kindLabel = { PRODUCT: "Sản phẩm", COURSE: "Khoá học", LIBRARY_ITEM: "Sách" } as const;

  const isSuspended = !!vendor.suspendedAt;
  const isApproved = vendor.applicationStatus === "APPROVED";
  const isActive = isApproved && !vendor.pausedAt && !isSuspended;

  return (
    <div className="space-y-6">
      <BackLink href="/admin/vendors">Nhà bán hàng</BackLink>
      <PageHeader
        title={vendor.shopName}
        description={
          isSuspended
            ? "Đã khoá bởi admin"
            : vendor.pausedAt
              ? "Vendor tự tạm ngừng"
              : vendor.applicationStatus === "APPROVED"
                ? `Đang hoạt động${vendor.reviewedAt ? ` · Duyệt ngày ${formatDateVN(vendor.reviewedAt)}` : ""}`
                : vendor.applicationStatus === "PENDING"
                  ? "Chờ duyệt"
                  : "Đã từ chối"
        }
        actions={
          isActive && (
            <Link
              href={`/shop/${vendor.slug}`}
              target="_blank"
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <ExternalLink className="h-4 w-4" />
              Xem gian hàng công khai
            </Link>
          )
        }
      />

      {vendor.applicationStatus === "PENDING" && (
        <div className="space-y-4 rounded-xl border border-warning-border bg-warning-bg/10 p-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Hồ sơ đang chờ duyệt</p>
            <p className="mt-0.5 text-xs text-muted">
              Nộp ngày {formatDateVN(vendor.appliedAt)}. Duyệt xong vendor có thể đăng sản phẩm bán ngay lập tức.
            </p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted">Email</dt>
              <dd className="text-foreground sm:text-right">{vendor.contactEmail}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted">Điện thoại</dt>
              <dd className="text-foreground sm:text-right">{vendor.contactPhone}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted">Ngân hàng</dt>
              <dd className="text-foreground sm:text-right">{vendor.bankName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-muted">Số tài khoản</dt>
              <dd className="text-foreground sm:text-right">{vendor.bankAccountNumber ?? "—"}</dd>
            </div>
          </dl>
          {vendor.bio && (
            <div className="rounded-lg border border-border bg-background p-3 text-sm text-muted">&quot;{vendor.bio}&quot;</div>
          )}
          <div className="sm:max-w-xs">
            <PendingVendorActions vendorId={vendor.id} />
          </div>
        </div>
      )}

      {vendor.applicationStatus === "REJECTED" && (
        <div className="rounded-xl border border-danger-border bg-danger-bg/10 p-5">
          <p className="text-sm font-semibold text-foreground">Hồ sơ đã bị từ chối</p>
          {vendor.reviewNote && <p className="mt-1 text-sm text-danger">Lý do: {vendor.reviewNote}</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Tổng doanh số</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(totalSales)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Hoa hồng nền tảng đã thu</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(platformCollected)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Đã trả cho vendor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(vendorPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Đang chờ trả</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(vendorPendingPayout)}</p>
        </div>
      </div>

      {isApproved && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">Tỉ lệ hoa hồng áp dụng</h2>
          <p className="mt-0.5 text-xs text-muted">Mặc định theo cấu hình chung — có thể chỉnh riêng cho gian hàng này.</p>
          <div className="mt-4">
            <CommissionRateForm vendorId={vendor.id} currentOverride={vendor.commissionPercentOverride} />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Sản phẩm đang bán</h2>
          <p className="mt-0.5 text-xs text-muted">Không cần duyệt trước khi đăng — admin chỉ hậu kiểm và có thể ẩn nếu vi phạm.</p>
        </div>
        {listings.length === 0 ? (
          <p className="p-6 text-sm text-muted">Vendor chưa đăng sản phẩm nào.</p>
        ) : (
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Sản phẩm</th>
                <th className="hidden py-2 font-medium sm:table-cell">Loại</th>
                <th className="py-2 text-right font-medium">Giá</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Đã bán</th>
                <th className="py-2 font-medium">Trạng thái</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((row) => {
                const Icon = kindIcon[row.kind];
                const adminHidden = !!row.hiddenReason;
                return (
                  <tr key={`${row.kind}:${row.id}`}>
                    <td className="py-2.5 pl-4">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Icon className="h-4 w-4 shrink-0 text-muted" />
                        {row.title}
                      </span>
                      {row.hiddenReason && <p className="mt-1 text-xs text-danger">Lý do ẩn: {row.hiddenReason}</p>}
                    </td>
                    <td className="hidden py-2.5 sm:table-cell">
                      <Badge color="muted">{kindLabel[row.kind]}</Badge>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">{formatVND(row.price)}</td>
                    <td className="hidden py-2.5 text-right tabular-nums text-foreground sm:table-cell">{row.soldCount}</td>
                    <td className="py-2.5">
                      {adminHidden ? (
                        <Badge color="muted">Đã ẩn</Badge>
                      ) : row.hidden ? (
                        <Badge color="muted">Vendor tự ẩn</Badge>
                      ) : (
                        <Badge color="success">Đang bán</Badge>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <HideListingButton kind={row.kind} itemId={row.id} hidden={adminHidden} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>

      {isApproved && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-danger-border bg-danger-bg/10 p-5">
          <div>
            <p className="text-sm font-semibold text-foreground">{isSuspended ? "Gian hàng đang bị khoá" : "Khoá gian hàng"}</p>
            <p className="mt-0.5 text-xs text-muted">
              {isSuspended && vendor.suspendReason
                ? `Lý do: ${vendor.suspendReason}`
                : "Ẩn toàn bộ sản phẩm khỏi khách & học viên, tạm dừng nhận đơn mới. Đơn đang xử lý vẫn tiếp tục."}
            </p>
          </div>
          <SuspendVendorControl vendorId={vendor.id} suspended={isSuspended} />
        </div>
      )}
    </div>
  );
}
