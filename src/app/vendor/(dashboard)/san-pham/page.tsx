import Link from "next/link";
import { Plus, Package, GraduationCap, BookOpen } from "lucide-react";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { getPricing } from "@/lib/pricing";
import { ToggleVendorListingButton } from "./toggle-listing-button";

type ListingRow = {
  id: string;
  kind: "PRODUCT" | "COURSE" | "LIBRARY_ITEM";
  title: string;
  price: number;
  salePrice: number | null;
  hidden: boolean;
  adminHidden: boolean;
  vendorHiddenReason: string | null;
  soldCount: number;
  href: string;
};

export default async function VendorProductsPage() {
  const { vendor } = await requireVendorAccountAccess();

  // A PAID-only filtered relation count, not the raw orderItems total —
  // "Đã bán" should never include a still-pending or cancelled line.
  const paidFilter = { where: { order: { status: "PAID" as const } } };

  const [products, courses, libraryItems] = await prisma.$transaction([
    prisma.product.findMany({
      where: { sellerId: vendor.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        price: true,
        salePrice: true,
        hiddenFromGuest: true,
        vendorHiddenAt: true,
        vendorHiddenReason: true,
        _count: { select: { orderItems: paidFilter } },
      },
    }),
    prisma.course.findMany({
      where: { sellerId: vendor.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        price: true,
        salePrice: true,
        hiddenFromGuest: true,
        vendorHiddenAt: true,
        vendorHiddenReason: true,
        _count: { select: { orderItems: paidFilter } },
      },
    }),
    prisma.libraryItem.findMany({
      where: { sellerId: vendor.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        price: true,
        salePrice: true,
        visibleToStudents: true,
        vendorHiddenAt: true,
        vendorHiddenReason: true,
        _count: { select: { orderItems: paidFilter } },
      },
    }),
  ]);

  const rows: ListingRow[] = [
    ...products.map((p) => ({
      id: p.id,
      kind: "PRODUCT" as const,
      title: p.title,
      price: p.price,
      salePrice: p.salePrice,
      hidden: p.hiddenFromGuest,
      adminHidden: !!p.vendorHiddenAt,
      vendorHiddenReason: p.vendorHiddenAt ? p.vendorHiddenReason : null,
      soldCount: p._count.orderItems,
      href: `/vendor/san-pham/hang-hoa/${p.id}`,
    })),
    ...courses.map((c) => ({
      id: c.id,
      kind: "COURSE" as const,
      title: c.title,
      price: c.price,
      salePrice: c.salePrice,
      hidden: c.hiddenFromGuest,
      adminHidden: !!c.vendorHiddenAt,
      vendorHiddenReason: c.vendorHiddenAt ? c.vendorHiddenReason : null,
      soldCount: c._count.orderItems,
      href: `/vendor/san-pham/khoa-hoc/${c.id}`,
    })),
    ...libraryItems.map((l) => ({
      id: l.id,
      kind: "LIBRARY_ITEM" as const,
      title: l.title,
      price: l.price,
      salePrice: l.salePrice,
      hidden: !l.visibleToStudents,
      adminHidden: !!l.vendorHiddenAt,
      vendorHiddenReason: l.vendorHiddenAt ? l.vendorHiddenReason : null,
      soldCount: l._count.orderItems,
      href: `/vendor/san-pham/sach/${l.id}`,
    })),
  ];

  const listedCount = rows.filter((r) => !r.hidden).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sản phẩm của tôi"
        description={`${rows.length} mặt hàng · ${listedCount} đang bán, ${rows.length - listedCount} đang ẩn`}
        actions={
          <Link
            href="/vendor/san-pham/moi"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Đăng sản phẩm mới
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-surface">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">Bạn chưa đăng sản phẩm/khoá học/sách nào.</p>
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
              {rows.map((row) => {
                const pricing = getPricing(row);
                const Icon = row.kind === "PRODUCT" ? Package : row.kind === "COURSE" ? GraduationCap : BookOpen;
                return (
                  <tr key={`${row.kind}:${row.id}`}>
                    <td className="py-2.5 pl-4">
                      <Link href={row.href} className="flex items-center gap-2 font-medium text-foreground hover:text-primary">
                        <Icon className="h-4 w-4 shrink-0 text-muted" />
                        {row.title}
                      </Link>
                      {row.vendorHiddenReason && (
                        <p className="mt-1 text-xs text-danger">Admin đã ẩn: {row.vendorHiddenReason}</p>
                      )}
                    </td>
                    <td className="hidden py-2.5 sm:table-cell">
                      <Badge color="muted">
                        {row.kind === "PRODUCT" ? "Sản phẩm" : row.kind === "COURSE" ? "Khoá học" : "Sách"}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {pricing.forSale ? formatVND(pricing.chargeAmount) : "Chưa niêm yết"}
                    </td>
                    <td className="hidden py-2.5 text-right tabular-nums text-foreground sm:table-cell">{row.soldCount}</td>
                    <td className="py-2.5">
                      {row.adminHidden ? (
                        <Badge color="danger">Bị admin ẩn</Badge>
                      ) : row.hidden ? (
                        <Badge color="muted">Đang ẩn</Badge>
                      ) : (
                        <Badge color="success">Đang bán</Badge>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {!row.adminHidden && (
                          <ToggleVendorListingButton kind={row.kind} id={row.id} hidden={row.hidden} />
                        )}
                        <Link href={row.href} className="text-xs font-medium text-primary hover:text-primary-hover">
                          Sửa
                        </Link>
                      </div>
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
