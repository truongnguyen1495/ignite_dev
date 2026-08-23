import Link from "next/link";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateVN } from "@/lib/date";
import { PendingVendorActions } from "./pending-vendor-actions";

const KIND_LABELS = [
  { key: "intendsProducts" as const, label: "Sản phẩm" },
  { key: "intendsCourses" as const, label: "Khoá học" },
  { key: "intendsLibraryItems" as const, label: "Sách" },
];

export default async function AdminVendorsPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ vendorId?: string }>;
}) {
  await requireAdminPermission("MANAGE_VENDORS");
  const { vendorId } = await searchParams;

  const pending = await prisma.vendor.findMany({
    where: { applicationStatus: "PENDING" },
    orderBy: { appliedAt: "asc" },
    include: { user: { select: { name: true } } },
  });

  const selected = pending.find((v) => v.id === vendorId) ?? pending[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Duyệt hồ sơ Nhà bán hàng" description={`${pending.length} hồ sơ đang chờ duyệt`} />

      {pending.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Không có hồ sơ nào đang chờ duyệt.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-foreground">Hồ sơ chờ xử lý</h2>
            </div>
            <div className="divide-y divide-border">
              {pending.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/admin/vendors/pending?vendorId=${vendor.id}`}
                  className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                    selected?.id === vendor.id ? "border-l-2 border-primary bg-surface-hover" : "hover:bg-surface-hover"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{vendor.shopName}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {vendor.user.name} · nộp {formatDateVN(vendor.appliedAt)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {KIND_LABELS.filter((k) => vendor[k.key]).map((k) => (
                        <Badge key={k.key} color="muted">
                          {k.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge color="warning">Chờ duyệt</Badge>
                </Link>
              ))}
            </div>
          </div>

          {selected && (
            <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">{selected.shopName}</h3>
                <p className="mt-0.5 text-xs text-faint">Người đại diện: {selected.user.name}</p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Email</dt>
                  <dd className="text-right text-foreground">{selected.contactEmail}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Điện thoại</dt>
                  <dd className="text-right text-foreground">{selected.contactPhone}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Dự định bán</dt>
                  <dd className="text-right text-foreground">
                    {KIND_LABELS.filter((k) => selected[k.key]).map((k) => k.label).join(", ") || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Ngân hàng</dt>
                  <dd className="text-right text-foreground">{selected.bankName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Số tài khoản</dt>
                  <dd className="text-right text-foreground">{selected.bankAccountNumber ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Chủ tài khoản</dt>
                  <dd className="text-right text-foreground">{selected.bankAccountHolder ?? "—"}</dd>
                </div>
              </dl>
              {selected.bio && (
                <div className="rounded-lg border border-border bg-background p-3 text-sm text-muted">
                  &quot;{selected.bio}&quot;
                </div>
              )}
              <PendingVendorActions vendorId={selected.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
