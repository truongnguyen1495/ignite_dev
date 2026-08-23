import Link from "next/link";
import { ClipboardList, Wallet } from "lucide-react";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import type { Vendor } from "@prisma/client";

function statusBadge(vendor: Vendor): { label: string; color: BadgeColor } {
  if (vendor.applicationStatus === "PENDING") return { label: "Chờ duyệt", color: "warning" };
  if (vendor.applicationStatus === "REJECTED") return { label: "Đã từ chối", color: "danger" };
  if (vendor.suspendedAt) return { label: "Đã khoá", color: "danger" };
  if (vendor.pausedAt) return { label: "Vendor tạm ngừng", color: "muted" };
  return { label: "Đang hoạt động", color: "success" };
}

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  await requireAdminPermission("MANAGE_VENDORS");

  const [vendors, salesByVendor, pendingCount] = await prisma.$transaction([
    prisma.vendor.findMany({
      where: q ? { shopName: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.commission.groupBy({ by: ["vendorId"], _sum: { grossAmount: true }, orderBy: { vendorId: "asc" } }),
    prisma.vendor.count({ where: { applicationStatus: "PENDING" } }),
  ]);

  const salesById = new Map(salesByVendor.map((row) => [row.vendorId, row._sum?.grossAmount ?? 0]));
  const activeCount = vendors.filter((v) => v.applicationStatus === "APPROVED" && !v.pausedAt && !v.suspendedAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhà bán hàng"
        description={`${vendors.length} gian hàng · ${activeCount} đang hoạt động`}
        actions={
          <>
            <Link
              href="/admin/vendors/pending"
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <ClipboardList className="h-4 w-4" />
              Hồ sơ chờ duyệt ({pendingCount})
            </Link>
            <Link
              href="/admin/vendors/payouts"
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <Wallet className="h-4 w-4" />
              Yêu cầu rút tiền
            </Link>
          </>
        }
      />

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Tất cả gian hàng</h2>
          <form className="w-full max-w-xs">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Tìm theo tên gian hàng..."
              className="w-full rounded-lg border border-border-strong bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </form>
        </div>
        {vendors.length === 0 ? (
          <p className="p-6 text-sm text-muted">Không tìm thấy gian hàng nào.</p>
        ) : (
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Gian hàng</th>
                <th className="hidden py-2 font-medium sm:table-cell">Chủ gian hàng</th>
                <th className="hidden py-2 font-medium sm:table-cell">Duyệt ngày</th>
                <th className="py-2 text-right font-medium">Doanh số</th>
                <th className="py-2 font-medium">Trạng thái</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.map((vendor) => {
                const status = statusBadge(vendor);
                return (
                  <tr key={vendor.id}>
                    <td className="py-2.5 pl-4">
                      <Link href={`/admin/vendors/${vendor.id}`} className="font-medium text-foreground hover:text-primary">
                        {vendor.shopName}
                      </Link>
                    </td>
                    <td className="hidden py-2.5 text-muted sm:table-cell">{vendor.user.name}</td>
                    <td className="hidden py-2.5 text-muted sm:table-cell">
                      {vendor.reviewedAt ? formatDateVN(vendor.reviewedAt) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {formatVND(salesById.get(vendor.id) ?? 0)}
                    </td>
                    <td className="py-2.5">
                      <Badge color={status.color}>{status.label}</Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/vendors/${vendor.id}`} className="text-xs font-medium text-primary hover:text-primary-hover">
                        Xem chi tiết
                      </Link>
                    </td>
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
