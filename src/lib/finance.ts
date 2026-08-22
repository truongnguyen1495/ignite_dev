import "server-only";
import type { FinanceCategory, FinanceEntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, dateOnlyVN, todayVN } from "@/lib/groups";
import { toDateOnlyISOString } from "@/lib/date";
import {
  type RevenuePeriod,
  getPeriodMarkers,
  getPreviousPeriodMarkers,
  vnDayToInstant,
  daysBetween,
  pctChange,
} from "@/lib/revenue";

export type FinancePeriod = RevenuePeriod;

export type FinanceDailyPoint = {
  dateISO: string;
  label: string;
  isToday: boolean;
  income: number;
  expense: number;
};
export type FinanceCategorySlice = { category: FinanceCategory; amount: number };
export type FinanceLedgerRow = {
  id: string;
  type: FinanceEntryType;
  category: FinanceCategory;
  amount: number;
  note: string;
  occurredAtISO: string;
  createdByName: string;
};

export type FinanceReport = {
  period: FinancePeriod;
  rangeFromISO: string;
  /** Inclusive last VN calendar day covered (rangeToISO in getPeriodMarkers is exclusive). */
  rangeToISO: string;

  salesRevenue: number;
  manualIncome: number;
  totalIncome: number;
  totalIncomePrevious: number;
  totalIncomeChangePct: number | null;

  totalExpense: number;
  totalExpensePrevious: number;
  totalExpenseChangePct: number | null;
  expenseCount: number;

  netProfit: number;
  netProfitPrevious: number;
  netProfitChangePct: number | null;

  marginPct: number;
  marginPctPrevious: number;

  daily: FinanceDailyPoint[];
  expenseByCategory: FinanceCategorySlice[];
  incomeByCategory: FinanceCategorySlice[];
  ledger: FinanceLedgerRow[];
};

/**
 * Everything /admin/finance renders, for one period. Sales revenue is read
 * live from Order (same source as src/lib/revenue.ts) rather than copied
 * into a FinanceEntry row — one source of truth for "money from selling
 * things", combined with manual entries only at read time here.
 *
 * Four queries batched into one `$transaction` (connection_limit=1 — see the
 * project's own note on that; a bare Promise.all would only queue on one
 * connection). Same pattern as getRevenueReport/getOverview*.
 */
export async function getFinanceReport(period: FinancePeriod): Promise<FinanceReport> {
  const today = todayVN();
  const { from, to } = getPeriodMarkers(period, today);
  const { from: prevFrom, to: prevTo } = getPreviousPeriodMarkers(period, from, to);

  const fromInstant = vnDayToInstant(from);
  const toInstant = vnDayToInstant(to);
  const prevFromInstant = vnDayToInstant(prevFrom);
  const prevToInstant = vnDayToInstant(prevTo);

  const [currentOrders, prevOrdersAgg, currentEntries, prevEntriesByType] = await prisma.$transaction([
    prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: fromInstant, lt: toInstant }, deletedAt: null },
      select: { totalAmount: true, paidAt: true },
    }),
    prisma.order.aggregate({
      where: { status: "PAID", paidAt: { gte: prevFromInstant, lt: prevToInstant }, deletedAt: null },
      _sum: { totalAmount: true },
    }),
    // occurredAt is a @db.Date column — already UTC-midnight of the VN
    // calendar day (see todayVN's own comment), so it compares directly
    // against from/to with no vnDayToInstant conversion, unlike Order.paidAt.
    prisma.financeEntry.findMany({
      where: { occurredAt: { gte: from, lt: to }, deletedAt: null },
      select: {
        id: true,
        type: true,
        category: true,
        amount: true,
        note: true,
        occurredAt: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.financeEntry.groupBy({
      by: ["type"],
      where: { occurredAt: { gte: prevFrom, lt: prevTo }, deletedAt: null },
      orderBy: { type: "asc" },
      _sum: { amount: true },
    }),
  ]);

  const salesRevenue = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const salesRevenuePrevious = prevOrdersAgg._sum.totalAmount ?? 0;

  const manualIncome = currentEntries.filter((e) => e.type === "INCOME").reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = currentEntries.filter((e) => e.type === "EXPENSE").reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = currentEntries.filter((e) => e.type === "EXPENSE").length;

  const manualIncomePrevious = prevEntriesByType.find((g) => g.type === "INCOME")?._sum?.amount ?? 0;
  const totalExpensePrevious = prevEntriesByType.find((g) => g.type === "EXPENSE")?._sum?.amount ?? 0;

  const totalIncome = salesRevenue + manualIncome;
  const totalIncomePrevious = salesRevenuePrevious + manualIncomePrevious;
  const netProfit = totalIncome - totalExpense;
  const netProfitPrevious = totalIncomePrevious - totalExpensePrevious;
  const marginPct = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const marginPctPrevious = totalIncomePrevious > 0 ? (netProfitPrevious / totalIncomePrevious) * 100 : 0;

  // --- Thu chi theo ngày (VN calendar day) -----------------------------------
  const salesByDay = new Map<string, number>();
  for (const order of currentOrders) {
    if (!order.paidAt) continue;
    const key = toDateOnlyISOString(dateOnlyVN(order.paidAt));
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + order.totalAmount);
  }
  const incomeByDay = new Map<string, number>();
  const expenseByDay = new Map<string, number>();
  for (const entry of currentEntries) {
    const key = toDateOnlyISOString(entry.occurredAt);
    const target = entry.type === "INCOME" ? incomeByDay : expenseByDay;
    target.set(key, (target.get(key) ?? 0) + entry.amount);
  }
  const todayISO = toDateOnlyISOString(today);
  const dayCount = daysBetween(from, to);
  const daily: FinanceDailyPoint[] = Array.from({ length: dayCount }, (_, i) => {
    const date = addDays(from, i);
    const dateISO = toDateOnlyISOString(date);
    return {
      dateISO,
      label: `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      isToday: dateISO === todayISO,
      income: (salesByDay.get(dateISO) ?? 0) + (incomeByDay.get(dateISO) ?? 0),
      expense: expenseByDay.get(dateISO) ?? 0,
    };
  });

  // --- Theo danh mục -----------------------------------------------------------
  function byCategory(type: FinanceEntryType): FinanceCategorySlice[] {
    const totals = new Map<FinanceCategory, number>();
    for (const entry of currentEntries) {
      if (entry.type !== type) continue;
      totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount);
    }
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  const ledger: FinanceLedgerRow[] = currentEntries.map((e) => ({
    id: e.id,
    type: e.type,
    category: e.category,
    amount: e.amount,
    note: e.note,
    occurredAtISO: toDateOnlyISOString(e.occurredAt),
    createdByName: e.createdBy.name,
  }));

  return {
    period,
    rangeFromISO: toDateOnlyISOString(from),
    rangeToISO: toDateOnlyISOString(addDays(to, -1)),

    salesRevenue,
    manualIncome,
    totalIncome,
    totalIncomePrevious,
    totalIncomeChangePct: pctChange(totalIncome, totalIncomePrevious),

    totalExpense,
    totalExpensePrevious,
    totalExpenseChangePct: pctChange(totalExpense, totalExpensePrevious),
    expenseCount,

    netProfit,
    netProfitPrevious,
    netProfitChangePct: pctChange(netProfit, netProfitPrevious),

    marginPct,
    marginPctPrevious,

    daily,
    expenseByCategory: byCategory("EXPENSE"),
    incomeByCategory: byCategory("INCOME"),
    ledger,
  };
}
