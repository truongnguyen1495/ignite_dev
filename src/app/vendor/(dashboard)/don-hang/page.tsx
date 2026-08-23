import Link from "next/link";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import { orderItemTotal, formatOrderCode } from "@/lib/orders";
import { ConfirmShipmentButton } from "./confirm-shipment-button";

type StatusFilter = "all" | "pending" | "shipped" | "digital";

function classify(item: {
  kind: string;
  vendorShippedAt: Date | null;
  commission: { status: string } | null;
}): "refunded" | "digital" | "shipped" | "pending" {
  if (item.commission?.status === "CANCELLED") return "refunded";
  if (item.kind !== "PRODUCT") return "digital";
  return item.vendorShippedAt ? "shipped" : "pending";
}

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { vendor } = await requireVendorAccountAccess();
  const { status: rawStatus } = await searchParams;
  const activeFilter: StatusFilter =
    rawStatus === "pending" || rawStatus === "shipped" || rawStatus === "digital" ? rawStatus : "all";

  const items = await prisma.orderItem.findMany({
    where: { sellerId: vendor.id, order: { status: "PAID", deletedAt: null } },
    orderBy: { order: { paidAt: "desc" } },
    select: {
      id: true,
      kind: true,
      titleSnapshot: true,
      priceAtPurchase: true,
      quantity: true,
      vendorShippedAt: true,
      order: { select: { orderNumber: true, paidAt: true, student: { select: { name: true } } } },
      commission: { select: { status: true } },
    },
  });

  const classified = items.map((item) => ({ ...item, status: classify(item) }));
  const counts = {
    all: classified.length,
    pending: classified.filter((i) => i.status === "pending").length,
    shipped: classified.filter((i) => i.status === "shipped").length,
    digital: classified.filter((i) => i.status === "digital").length,
  };
  const visible = activeFilter === "all" ? classified : classified.filter((i) => i.status === activeFilter);

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: `Tất cả (${counts.all})` },
    { key: "pending", label: `Chờ đóng gói (${counts.pending})` },
    { key: "shipped", label: `Đã giao (${counts.shipped})` },
    { key: "digital", label: `Điện tử (${counts.digital})` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Đơn hàng" description="Chỉ hiển thị phần hàng thuộc gian hàng của bạn trong mỗi đơn." />

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/vendor/don-hang" : `/vendor/don-hang?status=${tab.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              tab.key === activeFilter
                ? "border-primary-border-strong bg-primary-bg text-primary"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {visible.length === 0 ? (
          <p className="p-6 text-sm text-muted">Không có đơn hàng nào ở mục này.</p>
        ) : (
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Mã đơn</th>
                <th className="py-2 font-medium">Sản phẩm (phần của bạn)</th>
                <th className="hidden py-2 font-medium sm:table-cell">Khách hàng</th>
                <th className="hidden py-2 font-medium sm:table-cell">Ngày đặt</th>
                <th className="py-2 text-right font-medium">Số tiền</th>
                <th className="py-2 font-medium">Trạng thái</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 pl-4 font-mono text-xs text-foreground">{formatOrderCode(item.order.orderNumber)}</td>
                  <td className="py-2.5 text-foreground">{item.titleSnapshot}</td>
                  <td className="hidden py-2.5 text-muted sm:table-cell">{item.order.student.name}</td>
                  <td className="hidden py-2.5 text-muted sm:table-cell">
                    {item.order.paidAt ? formatDateVN(item.order.paidAt) : "—"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-foreground">{formatVND(orderItemTotal(item))}</td>
                  <td className="py-2.5">
                    {item.status === "refunded" && <Badge color="danger">Khách đã hoàn đơn</Badge>}
                    {item.status === "digital" && <Badge color="info">Điện tử · tự động cấp</Badge>}
                    {item.status === "shipped" && <Badge color="success">Đã giao</Badge>}
                    {item.status === "pending" && <Badge color="warning">Chờ đóng gói</Badge>}
                  </td>
                  <td className="py-2.5 pr-4">
                    {item.status === "pending" && <ConfirmShipmentButton orderItemId={item.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
      {classified.some((i) => i.status === "refunded") && (
        <p className="text-xs text-muted">
          Một số đơn đã bị khách hoàn — hoa hồng tương ứng đã được xử lý tự động, xem chi tiết ở mục{" "}
          <Link href="/vendor/hoa-hong" className="text-primary hover:text-primary-hover">
            Hoa hồng &amp; Rút tiền
          </Link>
          .
        </p>
      )}
    </div>
  );
}
