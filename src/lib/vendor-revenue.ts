import "server-only";
import type { OrderItemKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, dateOnlyVN, todayVN } from "@/lib/groups";
import { toDateOnlyISOString } from "@/lib/date";
import {
  daysBetween,
  getPeriodMarkers,
  getPreviousPeriodMarkers,
  pctChange,
  vnDayToInstant,
  type RevenueDailyPoint,
  type RevenueKindSlice,
  type RevenuePeriod,
  type RevenueTopProduct,
} from "@/lib/revenue";

/**
 * Vendor counterpart to getRevenueReport (src/lib/revenue.ts) — same period
 * math (getPeriodMarkers/getPreviousPeriodMarkers/pctChange/vnDayToInstant
 * reused, not reimplemented), but scoped to one vendor's own OrderItem lines
 * instead of the whole platform. "gross" here is deliberately the vendor's
 * own line total (priceAtPurchase * quantity on THIS vendor's items only),
 * never Order.totalAmount, which can include another vendor's lines or
 * shipping fees that don't belong to this vendor's sales figure.
 *
 * This is a "hiệu quả bán hàng" tracking report, not a money-in-hand report
 * — /vendor/hoa-hong (getVendorBalance) is the one place that reflects what
 * a vendor actually gets to withdraw after RapidX's commission.
 */
export type VendorRevenueReport = {
  period: RevenuePeriod;
  rangeFromISO: string;
  rangeToISO: string;

  gross: number;
  grossPrevious: number;
  grossChangePct: number | null;

  saleCount: number;
  saleCountPrevious: number;
  saleCountChangePct: number | null;

  aov: number;
  aovPrevious: number;
  aovChangePct: number | null;

  refundTotal: number;
  refundTotalPrevious: number;
  refundTotalChangePct: number | null;
  refundCount: number;

  daily: RevenueDailyPoint[];
  byKind: RevenueKindSlice[];
  topItems: RevenueTopProduct[];
};

type VendorOrderLine = {
  kind: OrderItemKind;
  titleSnapshot: string;
  priceAtPurchase: number;
  quantity: number;
  courseId: string | null;
  libraryItemId: string | null;
  productId: string | null;
  order: { paidAt: Date | null };
};

function lineAmount(item: { priceAtPurchase: number; quantity: number }): number {
  return item.priceAtPurchase * item.quantity;
}

function sumGross(items: VendorOrderLine[]): number {
  return items.reduce((sum, item) => sum + lineAmount(item), 0);
}

export async function getVendorRevenueReport(vendorId: string, period: RevenuePeriod): Promise<VendorRevenueReport> {
  const today = todayVN();
  const { from, to } = getPeriodMarkers(period, today);
  const { from: prevFrom, to: prevTo } = getPreviousPeriodMarkers(period, from, to);

  const fromInstant = vnDayToInstant(from);
  const toInstant = vnDayToInstant(to);
  const prevFromInstant = vnDayToInstant(prevFrom);
  const prevToInstant = vnDayToInstant(prevTo);

  const lineSelect = {
    kind: true,
    titleSnapshot: true,
    priceAtPurchase: true,
    quantity: true,
    courseId: true,
    libraryItemId: true,
    productId: true,
    order: { select: { paidAt: true } },
  } as const;

  // Six queries batched into one $transaction (array form) — same
  // connection_limit=1 reasoning as getRevenueReport itself: a Promise.all of
  // these would only queue on the one pooled connection, not parallelize.
  const [currentItems, previousItems, currentCancelled, previousCancelled, currentAdjustments, previousAdjustments] =
    await prisma.$transaction([
      prisma.orderItem.findMany({
        where: { sellerId: vendorId, order: { status: "PAID", paidAt: { gte: fromInstant, lt: toInstant }, deletedAt: null } },
        select: lineSelect,
      }),
      prisma.orderItem.findMany({
        where: { sellerId: vendorId, order: { status: "PAID", paidAt: { gte: prevFromInstant, lt: prevToInstant }, deletedAt: null } },
        select: lineSelect,
      }),
      prisma.commission.findMany({
        where: { vendorId, status: "CANCELLED", cancelledAt: { gte: fromInstant, lt: toInstant } },
        select: { vendorAmount: true },
      }),
      prisma.commission.findMany({
        where: { vendorId, status: "CANCELLED", cancelledAt: { gte: prevFromInstant, lt: prevToInstant } },
        select: { vendorAmount: true },
      }),
      prisma.commissionAdjustment.findMany({
        where: { vendorId, createdAt: { gte: fromInstant, lt: toInstant } },
        select: { amount: true },
      }),
      prisma.commissionAdjustment.findMany({
        where: { vendorId, createdAt: { gte: prevFromInstant, lt: prevToInstant } },
        select: { amount: true },
      }),
    ]);

  const gross = sumGross(currentItems);
  const grossPrevious = sumGross(previousItems);
  const saleCount = currentItems.length;
  const saleCountPrevious = previousItems.length;
  const aov = saleCount > 0 ? Math.round(gross / saleCount) : 0;
  const aovPrevious = saleCountPrevious > 0 ? Math.round(grossPrevious / saleCountPrevious) : 0;

  // CommissionAdjustment.amount is stored negative (see its own comment in
  // schema.prisma) — abs() here since this is a plain "refunded amount"
  // figure for the vendor, not a signed balance adjustment.
  const refundTotal =
    currentCancelled.reduce((sum, c) => sum + c.vendorAmount, 0) +
    currentAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const refundTotalPrevious =
    previousCancelled.reduce((sum, c) => sum + c.vendorAmount, 0) +
    previousAdjustments.reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const refundCount = currentCancelled.length + currentAdjustments.length;

  // --- Doanh thu theo ngày (VN calendar day) --------------------------------
  const dailyAmounts = new Map<string, number>();
  for (const item of currentItems) {
    if (!item.order.paidAt) continue;
    const key = toDateOnlyISOString(dateOnlyVN(item.order.paidAt));
    dailyAmounts.set(key, (dailyAmounts.get(key) ?? 0) + lineAmount(item));
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

  // --- Theo loại hàng, top sản phẩm ------------------------------------------
  const kindTotals = new Map<OrderItemKind, number>();
  const itemTotals = new Map<string, RevenueTopProduct>();
  for (const item of currentItems) {
    const amount = lineAmount(item);
    kindTotals.set(item.kind, (kindTotals.get(item.kind) ?? 0) + amount);

    const itemId = item.courseId ?? item.libraryItemId ?? item.productId ?? null;
    const key = `${item.kind}:${itemId ?? item.titleSnapshot}`;
    const existing = itemTotals.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.amount += amount;
    } else {
      itemTotals.set(key, { itemId, kind: item.kind, title: item.titleSnapshot, quantity: item.quantity, amount });
    }
  }
  const byKind: RevenueKindSlice[] = Array.from(kindTotals.entries())
    .map(([kind, amount]) => ({ kind, amount }))
    .sort((a, b) => b.amount - a.amount);
  const topItems = Array.from(itemTotals.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    period,
    rangeFromISO: toDateOnlyISOString(from),
    rangeToISO: toDateOnlyISOString(addDays(to, -1)),

    gross,
    grossPrevious,
    grossChangePct: pctChange(gross, grossPrevious),

    saleCount,
    saleCountPrevious,
    saleCountChangePct: pctChange(saleCount, saleCountPrevious),

    aov,
    aovPrevious,
    aovChangePct: pctChange(aov, aovPrevious),

    refundTotal,
    refundTotalPrevious,
    refundTotalChangePct: pctChange(refundTotal, refundTotalPrevious),
    refundCount,

    daily,
    byKind,
    topItems,
  };
}
