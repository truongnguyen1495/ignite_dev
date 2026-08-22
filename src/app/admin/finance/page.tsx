import Link from "next/link";
import { Wallet, TrendingDown, TrendingUp, Percent } from "lucide-react";
import { requireAdminPermission } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard, BreakdownCard, DeltaChip, formatPct } from "@/components/ui/report-kpi";
import { formatVND } from "@/lib/currency";
import { toDateOnlyISOString } from "@/lib/date";
import { todayVN } from "@/lib/groups";
import { getFinanceReport, type FinancePeriod } from "@/lib/finance";
import { FINANCE_CATEGORY_LABELS } from "@/lib/finance-labels";
import { isRevenuePeriod, REVENUE_PERIOD_LABELS } from "@/lib/revenue";
import { FinanceDayChart } from "./finance-day-chart";
import { ExportCsvButton } from "./export-csv-button";
import { AddEntryButton } from "./add-entry-button";
import { LedgerTable } from "./ledger-table";

const PERIODS: FinancePeriod[] = ["today", "7d", "month", "quarter"];

function isoToDDMM(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function buildHref(period: FinancePeriod, compare: boolean): string {
  const params = new URLSearchParams();
  if (period !== "month") params.set("period", period);
  if (!compare) params.set("compare", "0");
  const qs = params.toString();
  return `/admin/finance${qs ? `?${qs}` : ""}`;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; compare?: string }>;
}) {
  const admin = await requireAdminPermission("MANAGE_FINANCE");

  const params = await searchParams;
  const period: FinancePeriod = isRevenuePeriod(params.period) ? params.period : "month";
  const compare = params.compare !== "0";

  const report = await getFinanceReport(period);
  const todayISO = toDateOnlyISOString(todayVN());

  const sourceTotal = report.totalIncome;
  const salesPct = sourceTotal > 0 ? (report.salesRevenue / sourceTotal) * 100 : 0;
  const manualIncomePct = sourceTotal > 0 ? (report.manualIncome / sourceTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thu chi"
        description="Sổ thu chi của doanh nghiệp và báo cáo lãi lỗ."
        actions={
          <>
            <ExportCsvButton report={report} />
            <AddEntryButton todayISO={todayISO} adminName={admin.name} />
          </>
        }
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
          icon={TrendingUp}
          label="Tổng thu"
          tone="success"
          value={formatVND(report.totalIncome)}
          sub={`Bán hàng ${formatVND(report.salesRevenue)} · Thu khác ${formatVND(report.manualIncome)}`}
          delta={compare ? <DeltaChip pct={report.totalIncomeChangePct} /> : null}
        />
        <KpiCard
          icon={TrendingDown}
          label="Tổng chi"
          tone="danger"
          value={formatVND(report.totalExpense)}
          sub={`${report.expenseCount} giao dịch trong kỳ`}
          delta={compare ? <DeltaChip pct={report.totalExpenseChangePct} invert /> : null}
        />
        <KpiCard
          icon={Wallet}
          label="Lợi nhuận ròng"
          tone={report.netProfit >= 0 ? "success" : "danger"}
          valueClassName={report.netProfit >= 0 ? "text-success" : "text-danger"}
          value={formatVND(report.netProfit)}
          sub="Thu − Chi trong kỳ"
          delta={compare ? <DeltaChip pct={report.netProfitChangePct} /> : null}
        />
        <KpiCard
          icon={Percent}
          label="Biên lợi nhuận"
          value={`${report.marginPct.toFixed(1).replace(".", ",")}%`}
          sub={compare ? `kỳ trước ${report.marginPctPrevious.toFixed(1).replace(".", ",")}%` : " "}
          delta={
            compare ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  report.marginPct >= report.marginPctPrevious ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
                }`}
              >
                {report.marginPct >= report.marginPctPrevious ? "+" : ""}
                {(report.marginPct - report.marginPctPrevious).toFixed(1).replace(".", ",")}đ
              </span>
            ) : null
          }
        />
      </div>

      {/* Thu chi theo ngày --------------------------------------------------- */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Thu chi theo ngày</h2>
        <p className="mt-0.5 text-xs text-muted">
          {isoToDDMM(report.rangeFromISO)}–{isoToDDMM(report.rangeToISO)} · đã gồm doanh thu bán hàng trong Thu
        </p>
        <div className="mt-3">
          {report.daily.some((d) => d.income > 0 || d.expense > 0) ? (
            <FinanceDayChart data={report.daily} />
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted">
              Chưa có thu chi trong khoảng thời gian này.
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-success" />
            Thu/ngày
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-danger" />
            Chi/ngày
          </span>
        </div>
      </div>

      {/* Breakdown --------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard title="Theo nguồn thu" sub={`Tổng ${formatVND(sourceTotal)}`}>
          {sourceTotal === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có dữ liệu.</p>
          ) : (
            <>
              <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-hover">
                <div className="h-full bg-success" style={{ width: `${salesPct}%` }} />
                <div className="h-full bg-info" style={{ width: `${manualIncomePct}%` }} />
              </div>
              <div className="mt-4 space-y-2">
                <Link
                  href="/admin/revenue"
                  className="-mx-1.5 flex items-center justify-between rounded-lg px-1.5 py-1.5 text-xs transition-colors hover:bg-surface-hover"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span className="h-2.5 w-2.5 rounded-sm bg-success" />
                    Bán hàng (tự động)
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{formatVND(report.salesRevenue)}</span>
                </Link>
                <div className="flex items-center justify-between rounded-lg px-1.5 py-1.5 text-xs">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span className="h-2.5 w-2.5 rounded-sm bg-info" />
                    Thu khác (nhập tay)
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{formatVND(report.manualIncome)}</span>
                </div>
              </div>
            </>
          )}
        </BreakdownCard>

        <BreakdownCard title="Chi theo danh mục" sub={`Tổng ${formatVND(report.totalExpense)}`}>
          {report.expenseByCategory.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có khoản chi nào trong kỳ.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {report.expenseByCategory.map((slice) => {
                const pct = report.totalExpense > 0 ? (slice.amount / report.totalExpense) * 100 : 0;
                return (
                  <div key={slice.category}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{FINANCE_CATEGORY_LABELS[slice.category]}</span>
                      <span className="flex items-baseline gap-2">
                        <span className="tabular-nums text-foreground">{formatVND(slice.amount)}</span>
                        <span className="w-10 shrink-0 text-right tabular-nums text-muted">{formatPct(pct)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
                      <div className="h-full rounded-full bg-danger" style={{ width: `${pct}%`, opacity: 0.85 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BreakdownCard>

        <BreakdownCard title="Thu khác theo danh mục" sub={`Tổng ${formatVND(report.manualIncome)} · không gồm bán hàng`}>
          {report.incomeByCategory.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Chưa có khoản thu khác nào trong kỳ.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {report.incomeByCategory.map((slice) => {
                const pct = report.manualIncome > 0 ? (slice.amount / report.manualIncome) * 100 : 0;
                return (
                  <div key={slice.category}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{FINANCE_CATEGORY_LABELS[slice.category]}</span>
                      <span className="flex items-baseline gap-2">
                        <span className="tabular-nums text-foreground">{formatVND(slice.amount)}</span>
                        <span className="w-10 shrink-0 text-right tabular-nums text-muted">{formatPct(pct)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BreakdownCard>
      </div>

      {/* Sổ giao dịch --------------------------------------------------------- */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <LedgerTable ledger={report.ledger} />
      </div>
    </div>
  );
}
