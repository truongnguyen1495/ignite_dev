import type { ReactNode } from "react";
import Link from "next/link";
import type { OrderItemKind, PaymentMethod } from "@prisma/client";
import {
  Wallet,
  Receipt,
  TrendingUp,
  RotateCcw,
  Clock,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  GraduationCap,
  Library,
  Package,
  type LucideIcon,
} from "lucide-react";
import { requireAdminPermission, requireSalesEnabled } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { ORDER_ITEM_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { REFUND_REASON_LABELS } from "@/lib/refund-labels";
import { getRevenueReport, isRevenuePeriod, REVENUE_PERIOD_LABELS, type RevenuePeriod } from "@/lib/revenue";
import { RevenueDayChart } from "./revenue-day-chart";
import { ExportCsvButton } from "./export-csv-button";

const PERIODS: RevenuePeriod[] = ["today", "7d", "month", "quarter"];

const KIND_BAR_CLASS: Record<OrderItemKind, string> = {
  COURSE: "bg-primary",
  LIBRARY_ITEM: "bg-info",
  PRODUCT: "bg-accent",
};
const KIND_ICON: Record<OrderItemKind, LucideIcon> = {
  COURSE: GraduationCap,
  LIBRARY_ITEM: Library,
  PRODUCT: Package,
};
const METHOD_BAR_CLASS: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "bg-primary",
  COD: "bg-info",
};

function isoToDDMM(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function buildHref(period: RevenuePeriod, compare: boolean): string {
  const params = new URLSearchParams();
  if (period !== "month") params.set("period", period);
  if (!compare) params.set("compare", "0");
  const qs = params.toString();
  return `/admin/revenue${qs ? `?${qs}` : ""}`;
}

function formatPct(pct: number): string {
  return `${Math.abs(pct).toFixed(1).replace(".", ",")}%`;
}

/** invert=true for a metric where going UP is bad (refunds) rather than good. */
function DeltaChip({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-muted">Mới</span>
    );
  }
  if (Math.abs(pct) < 0.05) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-muted">
        Không đổi
      </span>
    );
  }
  const isIncrease = pct > 0;
  const isGood = invert ? !isIncrease : isIncrease;
  const Icon = isIncrease ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        isGood ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatPct(pct)}
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  delta: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-bg text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {delta}
      </div>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </div>
  );
}

function BreakdownCard({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      {children}
    </div>
  );
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; compare?: string }>;
}) {
  await requireAdminPermission("MANAGE_FINANCE");
  await requireSalesEnabled("/admin/settings");

  const params = await searchParams;
  const period: RevenuePeriod = isRevenuePeriod(params.period) ? params.period : "month";
  const compare = params.compare !== "0";

  const report = await getRevenueReport(period);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doanh thu"
        description="Báo cáo doanh thu toàn hệ thống theo thời gian, sản phẩm và đội nhóm."
        actions={<ExportCsvButton report={report} />}
      />

      {/* Bộ lọc khoảng thời gian ------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2.5">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={buildHref(p, compare)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                p === period
                  ? "border-primary-border-strong bg-primary-bg text-primary"
                  : "border-border text-muted hover:bg-surface-hover"
              }`}
            >
              {REVENUE_PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
        <Link
          href={buildHref(period, !compare)}
          className="ml-auto flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:bg-surface-hover"
        >
          <span className={`relative h-4 w-7 rounded-full transition-colors ${compare ? "bg-primary" : "bg-surface-hover"}`}>
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-primary-foreground transition-transform ${
                compare ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
          So với kỳ trước
        </Link>
      </div>

      {/* KPI ---------------------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Doanh thu ròng"
          value={formatVND(report.net)}
          sub={
            compare
              ? `${isoToDDMM(report.rangeFromISO)}–${isoToDDMM(report.rangeToISO)} · kỳ trước ${formatVND(report.netPrevious)}`
              : `${isoToDDMM(report.rangeFromISO)}–${isoToDDMM(report.rangeToISO)}`
          }
          delta={compare ? <DeltaChip pct={report.netChangePct} /> : null}
        />
        <KpiCard
          icon={Receipt}
          label="Đơn hàng đã thanh toán"
          value={`${report.paidOrderCount} đơn`}
          sub={compare ? `kỳ trước ${report.paidOrderCountPrevious} đơn` : " "}
          delta={compare ? <DeltaChip pct={report.paidOrderCountChangePct} /> : null}
        />
        <KpiCard
          icon={TrendingUp}
          label="Giá trị đơn trung bình"
          value={formatVND(report.aov)}
          sub={compare ? `kỳ trước ${formatVND(report.aovPrevious)}` : " "}
          delta={compare ? <DeltaChip pct={report.aovChangePct} /> : null}
        />
        <KpiCard
          icon={RotateCcw}
          label="Hoàn tiền"
          value={formatVND(report.refundTotal)}
          sub={
            compare
              ? `${report.refundCount} lượt hoàn · kỳ trước ${formatVND(report.refundTotalPrevious)}`
              : `${report.refundCount} lượt hoàn`
          }
          delta={compare ? <DeltaChip pct={report.refundTotalChangePct} invert /> : null}
        />
      </div>

      {/* Đang chờ xử lý — snapshot hiện tại, không theo kỳ đã chọn -------------- */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-border-strong bg-surface p-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-bg text-warning">
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Đang chờ xử lý</p>
            <p className="text-xs text-muted">Chưa tính vào doanh thu ròng</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-sm">
          <div>
            <p className="text-xs text-muted">Chờ chuyển khoản</p>
            <p className="font-semibold tabular-nums text-foreground">
              {report.pending.pendingCount} đơn · {formatVND(report.pending.pendingAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Chờ thu hộ (COD)</p>
            <p className="font-semibold tabular-nums text-foreground">
              {report.pending.codCount} đơn · {formatVND(report.pending.codAmount)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-warning">Tổng đang treo</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{formatVND(report.pending.totalAmount)}</p>
        </div>

        <Link
          href="/admin/orders?status=pending"
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary-hover transition-colors hover:text-primary"
        >
          Xem đơn đang chờ <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Doanh thu theo ngày --------------------------------------------------- */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Doanh thu theo ngày</h2>
        <p className="mt-0.5 text-xs text-muted">
          {isoToDDMM(report.rangeFromISO)}–{isoToDDMM(report.rangeToISO)} · đơn đã thanh toán
        </p>
        <div className="mt-3">
          {report.daily.some((d) => d.amount > 0) ? (
            <RevenueDayChart data={report.daily} />
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted">
              Chưa có doanh thu trong khoảng thời gian này.
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Doanh thu/ngày
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-info" />
            Hôm nay
          </span>
        </div>
      </div>

      {/* Breakdown --------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard title="Theo loại sản phẩm">
          {report.byProductKind.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {report.byProductKind.map((slice) => {
                const pct = report.gross > 0 ? (slice.amount / report.gross) * 100 : 0;
                return (
                  <Link
                    key={slice.kind}
                    href={`/admin/orders?kind=${slice.kind}`}
                    className="-mx-1.5 block rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{ORDER_ITEM_KIND_LABELS[slice.kind]}</span>
                      <span className="flex items-baseline gap-2">
                        <span className="tabular-nums text-foreground">{formatVND(slice.amount)}</span>
                        <span className="w-10 shrink-0 text-right tabular-nums text-muted">{formatPct(pct)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
                      <div className={`h-full rounded-full ${KIND_BAR_CLASS[slice.kind]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </BreakdownCard>

        <BreakdownCard title="Theo phương thức thanh toán">
          {report.byPaymentMethod.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có dữ liệu.</p>
          ) : (
            <>
              <div className="mt-4 flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-surface-hover">
                {report.byPaymentMethod.map((slice) => {
                  const pct = report.gross > 0 ? (slice.amount / report.gross) * 100 : 0;
                  return (
                    <div key={slice.method} className={`h-full ${METHOD_BAR_CLASS[slice.method]}`} style={{ width: `${pct}%` }} />
                  );
                })}
              </div>
              <div className="mt-4 space-y-1">
                {report.byPaymentMethod.map((slice) => {
                  const pct = report.gross > 0 ? (slice.amount / report.gross) * 100 : 0;
                  return (
                    <Link
                      key={slice.method}
                      href={`/admin/orders?method=${slice.method}`}
                      className="-mx-1.5 flex items-center justify-between rounded-lg px-1.5 py-1.5 text-xs transition-colors hover:bg-surface-hover"
                    >
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className={`h-2.5 w-2.5 rounded-sm ${METHOD_BAR_CLASS[slice.method]}`} />
                        {PAYMENT_METHOD_LABELS[slice.method]}
                      </span>
                      <span className="text-muted">
                        <span className="font-semibold tabular-nums text-foreground">{formatVND(slice.amount)}</span> · {formatPct(pct)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </BreakdownCard>

        <BreakdownCard title="Lý do hoàn tiền" sub={`Tổng ${formatVND(report.refundTotal)} · ${report.refundCount} lượt hoàn`}>
          {report.byRefundReason.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Không có lượt hoàn nào trong kỳ.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {report.byRefundReason.map((slice) => {
                const pct = report.refundTotal > 0 ? (slice.amount / report.refundTotal) * 100 : 0;
                return (
                  <Link
                    key={slice.reason}
                    href={`/admin/orders?refundReason=${slice.reason}`}
                    className="-mx-1.5 block rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">
                        {REFUND_REASON_LABELS[slice.reason]} <span className="text-muted">· {slice.count} lượt</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-foreground">{formatVND(slice.amount)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                      <div className="h-full rounded-full bg-danger" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </BreakdownCard>
      </div>

      {/* Top sản phẩm ------------------------------------------------------------- */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Sản phẩm bán chạy nhất</h2>
          <p className="text-xs text-muted">Xếp theo doanh thu</p>
        </div>
        {report.topProducts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Chưa có sản phẩm nào bán được trong kỳ.</p>
        ) : (
          <div className="mt-4">
            {/* "Loại" and "Lượt mua" are secondary — hidden below sm rather
                than forcing the table wider than a phone screen, so the one
                column the whole page is about (Doanh thu) is never scrolled
                out of sight. The kind icon rides along on the name cell
                instead so that context isn't lost entirely on mobile. */}
            <Table>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="w-8 py-2 font-medium"></th>
                  <th className="py-2 font-medium">Sản phẩm</th>
                  <th className="hidden py-2 font-medium sm:table-cell">Loại</th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">Lượt mua</th>
                  <th className="py-2 text-right font-medium">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.topProducts.map((product, i) => {
                  const maxAmount = report.topProducts[0]?.amount || 1;
                  const barPct = maxAmount > 0 ? (product.amount / maxAmount) * 100 : 0;
                  const Icon = KIND_ICON[product.kind];
                  const nameContent = product.itemId ? (
                    <Link
                      href={`/admin/orders?kind=${product.kind}&itemId=${product.itemId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {product.title}
                    </Link>
                  ) : (
                    product.title
                  );
                  return (
                    <tr key={`${product.kind}:${product.itemId ?? product.title}`}>
                      <td className="py-2.5 pr-2 text-xs text-muted">{i + 1}</td>
                      <td className="py-2.5 pr-3 font-medium text-foreground">
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted sm:hidden" />
                          <span className="block max-w-[150px] truncate sm:max-w-none" title={product.title}>
                            {nameContent}
                          </span>
                        </span>
                      </td>
                      <td className="hidden py-2.5 pr-3 sm:table-cell">
                        <Badge color="muted">
                          <Icon className="mr-1 h-3 w-3" />
                          {ORDER_ITEM_KIND_LABELS[product.kind]}
                        </Badge>
                      </td>
                      <td className="hidden py-2.5 pr-3 text-right tabular-nums text-foreground sm:table-cell">
                        {product.quantity}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-hover sm:block">
                            <span className="block h-full rounded-full bg-primary" style={{ width: `${barPct}%` }} />
                          </span>
                          <span className="text-right font-semibold tabular-nums text-foreground sm:min-w-[100px]">
                            {formatVND(product.amount)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
