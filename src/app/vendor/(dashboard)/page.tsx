import Link from "next/link";
import { Package, GraduationCap, BookOpen, TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getVendorBalance } from "@/lib/vendor-commission";
import { getVendorRevenueReport } from "@/lib/vendor-revenue";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import { ConfirmShipmentButton } from "./don-hang/confirm-shipment-button";
import type { OrderItemKind } from "@prisma/client";

const KIND_ICON: Record<OrderItemKind, LucideIcon> = {
  PRODUCT: Package,
  COURSE: GraduationCap,
  LIBRARY_ITEM: BookOpen,
};
const KIND_LABEL: Record<OrderItemKind, string> = {
  PRODUCT: "Sản phẩm",
  COURSE: "Khoá học",
  LIBRARY_ITEM: "Sách",
};

export default async function VendorOverviewPage() {
  const { vendor } = await requireVendorAccountAccess();

  // Each of these two already batches its own reads internally
  // (getVendorRevenueReport/getVendorBalance) — kept as sequential awaits
  // rather than Promise.all so this page never fires two independent
  // multi-query lib calls at once against the pooled connection_limit=1 DB.
  const revenueReport = await getVendorRevenueReport(vendor.id, "month");
  const balance = await getVendorBalance(vendor.id);

  const [recentItems, pendingShipmentCount, products, courses, libraryItems] = await prisma.$transaction([
    prisma.orderItem.findMany({
      where: { sellerId: vendor.id, order: { status: "PAID", deletedAt: null } },
      orderBy: { order: { paidAt: "desc" } },
      take: 8,
      select: {
        id: true,
        kind: true,
        titleSnapshot: true,
        vendorShippedAt: true,
        order: { select: { orderNumber: true, paidAt: true, student: { select: { name: true } } } },
      },
    }),
    // A real count, not derived from the `take: 8` preview above — a vendor
    // with more than 8 recent paid lines could otherwise have older
    // unshipped orders undercounted or missed entirely by this stat.
    prisma.orderItem.count({
      where: { sellerId: vendor.id, kind: "PRODUCT", vendorShippedAt: null, order: { status: "PAID", deletedAt: null } },
    }),
    prisma.product.findMany({ where: { sellerId: vendor.id }, select: { vendorHiddenAt: true } }),
    prisma.course.findMany({ where: { sellerId: vendor.id }, select: { vendorHiddenAt: true } }),
    prisma.libraryItem.findMany({ where: { sellerId: vendor.id }, select: { vendorHiddenAt: true } }),
  ]);

  const allListings = [...products, ...courses, ...libraryItems];
  const listedCount = allListings.filter((l) => !l.vendorHiddenAt).length;
  const hiddenCount = allListings.length - listedCount;

  const changePct = revenueReport.grossChangePct;
  const ChangeIcon = changePct !== null && changePct < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="space-y-6">
      <PageHeader title="Tổng quan" description={`Gian hàng ${vendor.shopName}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Doanh số tháng này</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(revenueReport.gross)}</p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            {changePct !== null && (
              <>
                <ChangeIcon className={`h-3.5 w-3.5 ${changePct >= 0 ? "text-success" : "text-danger"}`} />
                {Math.abs(changePct).toFixed(1)}% so với tháng trước
              </>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Đơn chờ xử lý</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{pendingShipmentCount}</p>
          <p className="mt-2 text-xs text-muted">Đơn hàng vật lý chưa xác nhận giao</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Hoa hồng khả dụng để rút</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(balance.netAvailable)}</p>
          <p className="mt-2 text-xs text-muted">Sau khi RapidX giữ hoa hồng</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Sản phẩm đang bán</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{listedCount}</p>
          <p className="mt-2 text-xs text-muted">{hiddenCount > 0 ? `${hiddenCount} sản phẩm đang ẩn` : "Không có sản phẩm ẩn"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Đơn hàng cần xử lý</h2>
            <p className="mt-0.5 text-xs text-muted">Hàng vật lý do bạn tự đóng gói &amp; giao — xác nhận khi đã gửi đi.</p>
          </div>
          <Link href="/vendor/don-hang" className="text-xs font-medium text-primary hover:text-primary-hover">
            Xem tất cả đơn →
          </Link>
        </div>
        {recentItems.length === 0 ? (
          <p className="p-4 text-sm text-muted">Chưa có đơn hàng nào.</p>
        ) : (
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Sản phẩm</th>
                <th className="hidden py-2 font-medium sm:table-cell">Khách hàng</th>
                <th className="hidden py-2 font-medium sm:table-cell">Ngày đặt</th>
                <th className="py-2 font-medium">Trạng thái</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 pl-4 font-medium text-foreground">{item.titleSnapshot}</td>
                  <td className="hidden py-2.5 text-muted sm:table-cell">{item.order.student.name}</td>
                  <td className="hidden py-2.5 text-muted sm:table-cell">
                    {item.order.paidAt ? formatDateVN(item.order.paidAt) : "—"}
                  </td>
                  <td className="py-2.5">
                    {item.kind === "PRODUCT" ? (
                      item.vendorShippedAt ? (
                        <Badge color="success">Đã giao</Badge>
                      ) : (
                        <Badge color="warning">Chờ đóng gói</Badge>
                      )
                    ) : (
                      <Badge color="info">Điện tử · tự động cấp</Badge>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {item.kind === "PRODUCT" && !item.vendorShippedAt && <ConfirmShipmentButton orderItemId={item.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Sản phẩm bán chạy tháng này</h2>
        </div>
        {revenueReport.topItems.length === 0 ? (
          <p className="p-4 text-sm text-muted">Chưa có sản phẩm nào bán được trong tháng.</p>
        ) : (
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Sản phẩm</th>
                <th className="hidden py-2 font-medium sm:table-cell">Loại</th>
                <th className="py-2 text-right font-medium">Đã bán</th>
                <th className="py-2 pr-4 text-right font-medium">Doanh số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenueReport.topItems.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <tr key={`${item.kind}:${item.itemId ?? item.title}`}>
                    <td className="py-2.5 pl-4">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Icon className="h-4 w-4 shrink-0 text-muted sm:hidden" />
                        {item.title}
                      </span>
                    </td>
                    <td className="hidden py-2.5 sm:table-cell">
                      <Badge color="muted">{KIND_LABEL[item.kind]}</Badge>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">{item.quantity}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">{formatVND(item.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
