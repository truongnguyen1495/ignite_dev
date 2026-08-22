import "server-only";
import type { OrderItemKind, PaymentMethod, RefundReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, dateOnlyVN, todayVN } from "@/lib/groups";
import { toDateOnlyISOString } from "@/lib/date";

// Same constant as groups.ts (kept private there) — Vietnam is UTC+7 with no
// DST, so this never changes. Needed here to turn a VN-calendar-day marker
// (UTC midnight of that day, per todayVN/addDays) into the real UTC instant
// that day actually starts at, for querying real timestamp columns
// (Order.paidAt, Refund.refundedAt). dateOnlyVN/todayVN exist for @db.Date
// columns, which is a different thing — see their own comments in groups.ts.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function vnDayToInstant(marker: Date): Date {
  return new Date(marker.getTime() - VN_OFFSET_MS);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export type RevenuePeriod = "today" | "7d" | "month" | "quarter";

export const REVENUE_PERIOD_LABELS: Record<RevenuePeriod, string> = {
  today: "Hôm nay",
  "7d": "7 ngày qua",
  month: "Tháng này",
  quarter: "Quý này",
};

export function isRevenuePeriod(value: string | undefined): value is RevenuePeriod {
  return value === "today" || value === "7d" || value === "month" || value === "quarter";
}

/** VN-calendar-day markers (UTC midnight of the VN day), `to` exclusive. */
function getPeriodMarkers(period: RevenuePeriod, today: Date): { from: Date; to: Date } {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  switch (period) {
    case "today":
      return { from: today, to: addDays(today, 1) };
    case "7d":
      return { from: addDays(today, -6), to: addDays(today, 1) };
    case "quarter": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return { from: new Date(Date.UTC(year, quarterStartMonth, 1)), to: addDays(today, 1) };
    }
    case "month":
      return { from: new Date(Date.UTC(year, month, 1)), to: addDays(today, 1) };
  }
}

// The comparison period shown next to every KPI. "month" gets a real
// calendar-previous-month-to-date range (1st–22nd of July vs 1st–22nd of
// August) rather than a rolling 22-day window, because that is what an
// admin actually means by "so với tháng trước". Every other period is short
// enough (a day, a week, a quarter) that a same-length rolling window
// immediately before `from` is the simpler and equally correct reading.
function getPreviousPeriodMarkers(period: RevenuePeriod, from: Date, to: Date): { from: Date; to: Date } {
  if (period === "month") {
    const year = from.getUTCFullYear();
    const month = from.getUTCMonth();
    const elapsedDays = daysBetween(from, to);
    const prevFrom = new Date(Date.UTC(year, month - 1, 1));
    const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const prevTo = addDays(prevFrom, Math.min(elapsedDays, daysInPrevMonth));
    return { from: prevFrom, to: prevTo };
  }
  const span = daysBetween(from, to);
  return { from: addDays(from, -span), to: from };
}

/** null = "không có gì để so sánh" (previous period was zero) rather than ±Infinity. */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export type RevenueDailyPoint = { dateISO: string; label: string; amount: number; isToday: boolean };
export type RevenueKindSlice = { kind: OrderItemKind; amount: number };
export type RevenuePaymentSlice = { method: PaymentMethod; amount: number; count: number };
export type RevenueRefundSlice = { reason: RefundReason; amount: number; count: number };
export type RevenueTopProduct = {
  itemId: string | null;
  kind: OrderItemKind;
  title: string;
  quantity: number;
  amount: number;
};

export type RevenueReport = {
  period: RevenuePeriod;
  rangeFromISO: string;
  /** Inclusive last VN calendar day covered (rangeToISO in getPeriodMarkers is exclusive). */
  rangeToISO: string;

  net: number;
  netPrevious: number;
  netChangePct: number | null;

  gross: number;
  paidOrderCount: number;
  paidOrderCountPrevious: number;
  paidOrderCountChangePct: number | null;

  aov: number;
  aovPrevious: number;
  aovChangePct: number | null;

  refundTotal: number;
  refundTotalPrevious: number;
  refundTotalChangePct: number | null;
  refundCount: number;

  pending: {
    pendingCount: number;
    pendingAmount: number;
    codCount: number;
    codAmount: number;
    totalAmount: number;
  };

  daily: RevenueDailyPoint[];
  byProductKind: RevenueKindSlice[];
  byPaymentMethod: RevenuePaymentSlice[];
  byRefundReason: RevenueRefundSlice[];
  topProducts: RevenueTopProduct[];
};

/**
 * Everything /admin/revenue renders, for one period. Six queries batched
 * into a single `$transaction` — this database runs with connection_limit=1
 * (see the project's own note on that), so a `Promise.all` of separate calls
 * would only queue on one connection instead of actually parallelizing; a
 * transaction sends them together. Same pattern as src/lib/overview.ts.
 */
export async function getRevenueReport(period: RevenuePeriod): Promise<RevenueReport> {
  const today = todayVN();
  const { from, to } = getPeriodMarkers(period, today);
  const { from: prevFrom, to: prevTo } = getPreviousPeriodMarkers(period, from, to);

  const fromInstant = vnDayToInstant(from);
  const toInstant = vnDayToInstant(to);
  const prevFromInstant = vnDayToInstant(prevFrom);
  const prevToInstant = vnDayToInstant(prevTo);

  const [currentOrders, previousAgg, currentRefunds, previousRefundAgg, pendingAgg, codAgg] = await prisma.$transaction([
    prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: fromInstant, lt: toInstant }, deletedAt: null },
      select: {
        totalAmount: true,
        paymentMethod: true,
        paidAt: true,
        items: {
          select: {
            kind: true,
            courseId: true,
            libraryItemId: true,
            productId: true,
            titleSnapshot: true,
            priceAtPurchase: true,
            quantity: true,
          },
        },
      },
    }),
    prisma.order.aggregate({
      where: { status: "PAID", paidAt: { gte: prevFromInstant, lt: prevToInstant }, deletedAt: null },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.refund.findMany({
      where: { refundedAt: { gte: fromInstant, lt: toInstant }, deletedAt: null, order: { deletedAt: null } },
      select: { amount: true, reason: true },
    }),
    prisma.refund.aggregate({
      where: { refundedAt: { gte: prevFromInstant, lt: prevToInstant }, deletedAt: null, order: { deletedAt: null } },
      _sum: { amount: true },
    }),
    // Two plain aggregates rather than one groupBy(by: ["status"]) — Prisma's
    // groupBy conditional types are notoriously fragile around _sum/_count
    // together with `by`, and there are only ever two statuses here anyway.
    prisma.order.aggregate({
      where: { status: "PENDING", deletedAt: null },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { status: "AWAITING_COD", deletedAt: null },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const gross = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paidOrderCount = currentOrders.length;
  const refundTotal = currentRefunds.reduce((sum, r) => sum + r.amount, 0);
  const refundCount = currentRefunds.length;
  const net = gross - refundTotal;
  const aov = paidOrderCount > 0 ? Math.round(gross / paidOrderCount) : 0;

  const grossPrevious = previousAgg._sum.totalAmount ?? 0;
  const paidOrderCountPrevious = previousAgg._count._all;
  const refundTotalPrevious = previousRefundAgg._sum.amount ?? 0;
  const netPrevious = grossPrevious - refundTotalPrevious;
  const aovPrevious = paidOrderCountPrevious > 0 ? Math.round(grossPrevious / paidOrderCountPrevious) : 0;

  // --- Doanh thu theo ngày (VN calendar day) --------------------------------
  const dailyAmounts = new Map<string, number>();
  for (const order of currentOrders) {
    if (!order.paidAt) continue;
    const key = toDateOnlyISOString(dateOnlyVN(order.paidAt));
    dailyAmounts.set(key, (dailyAmounts.get(key) ?? 0) + order.totalAmount);
  }
  const todayISO = toDateOnlyISOString(today);
  const dayCount = daysBetween(from, to);
  const daily: RevenueDailyPoint[] = Array.from({ length: dayCount }, (_, i) => {
    const date = addDays(from, i);
    const dateISO = toDateOnlyISOString(date);
    return {
      dateISO,
      label: `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      amount: dailyAmounts.get(dateISO) ?? 0,
      isToday: dateISO === todayISO,
    };
  });

  // --- Theo loại sản phẩm, top sản phẩm --------------------------------------
  const kindTotals = new Map<OrderItemKind, number>();
  const productTotals = new Map<string, RevenueTopProduct>();
  for (const order of currentOrders) {
    for (const item of order.items) {
      const lineAmount = item.priceAtPurchase * item.quantity;
      kindTotals.set(item.kind, (kindTotals.get(item.kind) ?? 0) + lineAmount);

      const itemId = item.courseId ?? item.libraryItemId ?? item.productId ?? null;
      const productKey = `${item.kind}:${itemId ?? item.titleSnapshot}`;
      const existing = productTotals.get(productKey);
      if (existing) {
        existing.quantity += item.quantity;
        existing.amount += lineAmount;
      } else {
        productTotals.set(productKey, {
          itemId,
          kind: item.kind,
          title: item.titleSnapshot,
          quantity: item.quantity,
          amount: lineAmount,
        });
      }
    }
  }
  const byProductKind: RevenueKindSlice[] = Array.from(kindTotals.entries())
    .map(([kind, amount]) => ({ kind, amount }))
    .sort((a, b) => b.amount - a.amount);
  const topProducts = Array.from(productTotals.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // --- Theo phương thức thanh toán --------------------------------------------
  const paymentTotals = new Map<PaymentMethod, { amount: number; count: number }>();
  for (const order of currentOrders) {
    const existing = paymentTotals.get(order.paymentMethod) ?? { amount: 0, count: 0 };
    existing.amount += order.totalAmount;
    existing.count += 1;
    paymentTotals.set(order.paymentMethod, existing);
  }
  const byPaymentMethod: RevenuePaymentSlice[] = Array.from(paymentTotals.entries())
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.amount - a.amount);

  // --- Lý do hoàn tiền ---------------------------------------------------------
  const reasonTotals = new Map<RefundReason, { amount: number; count: number }>();
  for (const refund of currentRefunds) {
    const existing = reasonTotals.get(refund.reason) ?? { amount: 0, count: 0 };
    existing.amount += refund.amount;
    existing.count += 1;
    reasonTotals.set(refund.reason, existing);
  }
  const byRefundReason: RevenueRefundSlice[] = Array.from(reasonTotals.entries())
    .map(([reason, v]) => ({ reason, ...v }))
    .sort((a, b) => b.amount - a.amount);

  // --- Đang chờ xử lý (snapshot hiện tại, không theo kỳ đã chọn) --------------
  const pendingAmount = pendingAgg._sum.totalAmount ?? 0;
  const codAmount = codAgg._sum.totalAmount ?? 0;

  return {
    period,
    rangeFromISO: toDateOnlyISOString(from),
    rangeToISO: toDateOnlyISOString(addDays(to, -1)),

    net,
    netPrevious,
    netChangePct: pctChange(net, netPrevious),

    gross,
    paidOrderCount,
    paidOrderCountPrevious,
    paidOrderCountChangePct: pctChange(paidOrderCount, paidOrderCountPrevious),

    aov,
    aovPrevious,
    aovChangePct: pctChange(aov, aovPrevious),

    refundTotal,
    refundTotalPrevious,
    refundTotalChangePct: pctChange(refundTotal, refundTotalPrevious),
    refundCount,

    pending: {
      pendingCount: pendingAgg._count._all,
      pendingAmount,
      codCount: codAgg._count._all,
      codAmount,
      totalAmount: pendingAmount + codAmount,
    },

    daily,
    byProductKind,
    byPaymentMethod,
    byRefundReason,
    topProducts,
  };
}
