import Link from "next/link";
import { Wallet, Receipt, TrendingUp, RotateCcw, GraduationCap, Library, Package, type LucideIcon } from "lucide-react";
import type { OrderItemKind } from "@prisma/client";
import { requireVendorAccountAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { KpiCard, BreakdownCard, DeltaChip, formatPct } from "@/components/ui/report-kpi";
import { formatVND } from "@/lib/currency";
import { REVENUE_PERIOD_LABELS, isRevenuePeriod, type RevenuePeriod } from "@/lib/revenue";
import { getVendorRevenueReport } from "@/lib/vendor-revenue";
import { VendorRevenueChart } from "./vendor-revenue-chart";

const PERIODS: RevenuePeriod[] = ["today", "7d", "month", "quarter"];

const KIND_LABEL: Record<OrderItemKind, string> = {
  PRODUCT: "Sản phẩm vật lý",
  COURSE: "Khoá học",
  LIBRARY_ITEM: "Sách & tài liệu",
};
const KIND_BAR_CLASS: Record<OrderItemKind, string> = {
  PRODUCT: "bg-accent",
  COURSE: "bg-primary",
  LIBRARY_ITEM: "bg-info",
};
const KIND_ICON: Record<OrderItemKind, LucideIcon> = {
  PRODUCT: Package,
  COURSE: GraduationCap,
  LIBRARY_ITEM: Library,
};

function isoToDDMM(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default async function VendorRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { vendor } = await requireVendorAccountAccess();
  const { period: rawPeriod } = await searchParams;
  const period: RevenuePeriod = isRevenuePeriod(rawPeriod) ? rawPeriod : "month";

  const report = await getVendorRevenueReport(vendor.id, period);

  return (
    <div className="space-y-6">
      <PageHeader title="Doanh thu" description="Hiệu quả bán hàng của riêng gian hàng bạn." />

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2.5">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={p === "month" ? "/vendor/doanh-thu" : `/vendor/doanh-thu?period=${p}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              p === period ? "border-primary-border-strong bg-primary-bg text-primary" : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            {REVENUE_PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Doanh thu gộp"
          value={formatVND(report.gross)}
          sub={`${isoToDDMM(report.rangeFromISO)}–${isoToDDMM(report.rangeToISO)} · kỳ trước ${formatVND(report.grossPrevious)}`}
          delta={<DeltaChip pct={report.grossChangePct} />}
        />
        <KpiCard
          icon={Receipt}
          label="Lượt bán"
          value={`${report.saleCount} lượt`}
          sub={`kỳ trước ${report.saleCountPrevious} lượt`}
          delta={<DeltaChip pct={report.saleCountChangePct} />}
        />
        <KpiCard
          icon={TrendingUp}
          label="Giá trị trung bình/lượt"
          value={formatVND(report.aov)}
          sub={`kỳ trước ${formatVND(report.aovPrevious)}`}
          delta={<DeltaChip pct={report.aovChangePct} />}
        />
        <KpiCard
          icon={RotateCcw}
          label="Hoàn tiền"
          value={formatVND(report.refundTotal)}
          sub={`${report.refundCount} lượt hoàn · kỳ trước ${formatVND(report.refundTotalPrevious)}`}
          delta={<DeltaChip pct={report.refundTotalChangePct} invert />}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Doanh thu theo ngày</h2>
        <p className="mt-0.5 text-xs text-muted">
          {isoToDDMM(report.rangeFromISO)}–{isoToDDMM(report.rangeToISO)}
        </p>
        <div className="mt-3">
          {report.daily.some((d) => d.amount > 0) ? (
            <VendorRevenueChart data={report.daily} />
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted">
              Chưa có doanh thu trong khoảng thời gian này.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Theo loại hàng">
          {report.byKind.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {report.byKind.map((slice) => {
                const pct = report.gross > 0 ? (slice.amount / report.gross) * 100 : 0;
                return (
                  <div key={slice.kind}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{KIND_LABEL[slice.kind]}</span>
                      <span className="flex items-baseline gap-2">
                        <span className="tabular-nums text-foreground">{formatVND(slice.amount)}</span>
                        <span className="w-10 shrink-0 text-right tabular-nums text-muted">{formatPct(pct)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
                      <div className={`h-full rounded-full ${KIND_BAR_CLASS[slice.kind]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BreakdownCard>

        <BreakdownCard title="Sản phẩm bán chạy nhất">
          {report.topItems.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có sản phẩm nào bán được trong kỳ.</p>
          ) : (
            <Table>
              <tbody className="divide-y divide-border">
                {report.topItems.map((item, i) => {
                  const Icon = KIND_ICON[item.kind];
                  return (
                    <tr key={`${item.kind}:${item.itemId ?? item.title}`}>
                      <td className="w-6 py-2 pr-2 text-xs text-muted">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                          <span className="truncate">{item.title}</span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-foreground">{formatVND(item.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </BreakdownCard>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <p className="max-w-xl text-xs text-muted">
          Số liệu này để theo dõi hiệu quả bán hàng — không phải số tiền bạn thực nhận. Xem &quot;Hoa hồng &amp; Rút
          tiền&quot; để biết số tiền sau khi trừ phần nền tảng.
        </p>
        <Link href="/vendor/hoa-hong" className="text-xs font-medium text-primary hover:text-primary-hover">
          Xem Hoa hồng &amp; Rút tiền →
        </Link>
      </div>
    </div>
  );
}
