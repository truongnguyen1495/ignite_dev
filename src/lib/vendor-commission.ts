import "server-only";
import { prisma } from "@/lib/prisma";
import { orderItemTotal } from "@/lib/orders";
import { resolveCommissionPercent, splitCommission } from "@/lib/vendor";

/**
 * Creates one Commission row for every OrderItem in this order whose catalog
 * row (Product/Course/LibraryItem) had a sellerId at the moment the order
 * became PAID — called once, from fulfillOrder, right after the access-grant
 * upserts. A PRODUCT line starts PENDING (the vendor still has to dropship
 * it); a COURSE/LIBRARY_ITEM line starts CONFIRMED immediately, since access
 * was just granted with nothing left to ship.
 *
 * Snapshots grossAmount/commissionPercent/vendorAmount at this exact moment
 * — see the Commission model's own comment for why nothing here is ever
 * recomputed later even if the vendor's rate or the item's price changes.
 *
 * Idempotent against a double-call (e.g. a retried webhook): Commission.orderItemId
 * is unique, so a second attempt for the same OrderItem is a no-op via
 * skipDuplicates rather than throwing.
 */
export async function createCommissionsForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      items: {
        where: { sellerId: { not: null } },
        select: { id: true, kind: true, sellerId: true, priceAtPurchase: true, quantity: true },
      },
    },
  });
  if (!order || order.items.length === 0) return;

  const vendorIds = Array.from(new Set(order.items.map((i) => i.sellerId!)));
  const [vendors, settings] = await Promise.all([
    prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, commissionPercentOverride: true },
    }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { vendorDefaultCommissionPercent: true } }),
  ]);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const defaultPercent = settings?.vendorDefaultCommissionPercent ?? 20;

  const now = new Date();
  const rows = order.items.flatMap((item) => {
    const vendor = vendorById.get(item.sellerId!);
    if (!vendor) return [];
    const grossAmount = orderItemTotal(item);
    const commissionPercent = resolveCommissionPercent(vendor, defaultPercent);
    const { vendorAmount } = splitCommission(grossAmount, commissionPercent);
    const isDigital = item.kind !== "PRODUCT";
    return [
      {
        vendorId: vendor.id,
        orderItemId: item.id,
        grossAmount,
        commissionPercent,
        vendorAmount,
        status: isDigital ? ("CONFIRMED" as const) : ("PENDING" as const),
        confirmedAt: isDigital ? now : null,
      },
    ];
  });
  if (rows.length === 0) return;

  await prisma.commission.createMany({ data: rows, skipDuplicates: true });
}

/**
 * A vendor confirming they've packed & shipped one of their own PRODUCT
 * lines (dropship — this app never touches the actual carrier/tracking
 * details, see OrderItem.vendorShippedAt's own comment). Flips the line's
 * Commission from PENDING to CONFIRMED, i.e. it becomes part of the vendor's
 * withdrawable balance.
 *
 * `vendorId` must come from the caller's own requireApprovedVendor() —
 * ownership is enforced here too (the where clause only matches a row that
 * is actually this vendor's), so this can never be used to confirm someone
 * else's shipment.
 */
export async function confirmVendorShipment(orderItemId: string, vendorId: string): Promise<{ error?: string }> {
  const { count } = await prisma.orderItem.updateMany({
    where: { id: orderItemId, sellerId: vendorId, kind: "PRODUCT", vendorShippedAt: null },
    data: { vendorShippedAt: new Date() },
  });
  if (count === 0) {
    return { error: "Không tìm thấy đơn hàng này, hoặc đơn đã được xác nhận giao trước đó." };
  }
  await prisma.commission.updateMany({
    where: { orderItemId, status: "PENDING" },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  return {};
}

/**
 * Reverses every vendor Commission tied to an order once a Refund is
 * recorded against it — called from recordRefundAction right after the
 * Refund row is created. See CommissionAdjustment's own comment for the
 * documented simplification: Refund is one lump amount per Order, not
 * itemized per line, so ANY refund on an order claws back EVERY vendor
 * Commission in that order in full, not a proportional share.
 *
 * Two different reversals depending on how far a line's commission had
 * already gotten:
 *  - PENDING/CONFIRMED (never paid out) — just cancel the row outright,
 *    nothing to claw back since the vendor never received the money.
 *  - PAID (already sent to the vendor) — the Commission row itself is left
 *    untouched (same "the event happened, don't rewrite history" philosophy
 *    as Refund itself) and a negative CommissionAdjustment is recorded
 *    instead, to be netted against that vendor's next payout.
 */
export async function clawbackCommissionsForRefund(orderId: string): Promise<void> {
  const commissions = await prisma.commission.findMany({
    where: { orderItem: { orderId }, status: { in: ["PENDING", "CONFIRMED", "PAID"] } },
    select: { id: true, vendorId: true, vendorAmount: true, status: true },
  });
  if (commissions.length === 0) return;

  const toCancel = commissions.filter((c) => c.status !== "PAID").map((c) => c.id);
  const toAdjust = commissions.filter((c) => c.status === "PAID");

  const ops = [];
  if (toCancel.length > 0) {
    ops.push(
      prisma.commission.updateMany({
        where: { id: { in: toCancel } },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      })
    );
  }
  for (const c of toAdjust) {
    ops.push(
      prisma.commissionAdjustment.create({
        data: {
          vendorId: c.vendorId,
          commissionId: c.id,
          amount: -c.vendorAmount,
          reason: "REFUND_AFTER_PAYOUT",
        },
      })
    );
  }
  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }
}

export type VendorBalance = {
  /** CONFIRMED commissions not yet attached to any payout request. */
  availableAmount: number;
  /** Outstanding (not yet settled into a payout request) negative adjustments. */
  outstandingDebt: number;
  /** availableAmount + outstandingDebt (outstandingDebt is <= 0), floored at 0 for display. */
  netAvailable: number;
};

/** The vendor's current withdrawable balance — see requestVendorPayout for the transaction that actually reserves it. */
export async function getVendorBalance(vendorId: string): Promise<VendorBalance> {
  const [commissionAgg, adjustmentAgg] = await Promise.all([
    prisma.commission.aggregate({
      where: { vendorId, status: "CONFIRMED", payoutRequestId: null },
      _sum: { vendorAmount: true },
    }),
    prisma.commissionAdjustment.aggregate({
      where: { vendorId, settledInPayoutRequestId: null },
      _sum: { amount: true },
    }),
  ]);
  const availableAmount = commissionAgg._sum.vendorAmount ?? 0;
  const outstandingDebt = adjustmentAgg._sum.amount ?? 0; // already negative
  return {
    availableAmount,
    outstandingDebt,
    netAvailable: Math.max(0, availableAmount + outstandingDebt),
  };
}

/**
 * Vendor asks to withdraw their current balance. Reserves every eligible
 * Commission/CommissionAdjustment row onto a new PayoutRequest (PENDING) so
 * the exact amount an admin later approves matches what the vendor saw when
 * they asked, rather than a number recomputed after more sales came in.
 */
export async function requestVendorPayout(vendorId: string): Promise<{ error?: string; payoutRequestId?: string }> {
  const [eligibleCommissions, unsettledAdjustments] = await Promise.all([
    prisma.commission.findMany({
      where: { vendorId, status: "CONFIRMED", payoutRequestId: null },
      select: { id: true, vendorAmount: true },
    }),
    prisma.commissionAdjustment.findMany({
      where: { vendorId, settledInPayoutRequestId: null },
      select: { id: true, amount: true },
    }),
  ]);

  const amount =
    eligibleCommissions.reduce((sum, c) => sum + c.vendorAmount, 0) +
    unsettledAdjustments.reduce((sum, a) => sum + a.amount, 0);

  if (amount <= 0) {
    return { error: "Không có số dư khả dụng để rút." };
  }
  if (eligibleCommissions.length === 0) {
    return { error: "Số dư âm do các khoản bị thu hồi — chưa thể tạo yêu cầu rút mới." };
  }

  const payoutRequest = await prisma.payoutRequest.create({
    data: { vendorId, amount, status: "PENDING" },
  });

  await prisma.$transaction([
    prisma.commission.updateMany({
      where: { id: { in: eligibleCommissions.map((c) => c.id) } },
      data: { payoutRequestId: payoutRequest.id },
    }),
    ...(unsettledAdjustments.length > 0
      ? [
          prisma.commissionAdjustment.updateMany({
            where: { id: { in: unsettledAdjustments.map((a) => a.id) } },
            data: { settledInPayoutRequestId: payoutRequest.id },
          }),
        ]
      : []),
  ]);

  return { payoutRequestId: payoutRequest.id };
}

/**
 * Admin confirms a payout was actually transferred. Auto-creates exactly one
 * FinanceEntry (COMMISSION_PAYOUT) rather than requiring a second manual
 * entry — see PayoutRequest.financeEntryId's own comment. Not one
 * interactive $transaction across all of this (matching fulfillOrder's own
 * documented reason: this app's pooled connection can't reliably hold an
 * interactive transaction open across round trips) — the atomic guard on the
 * first update is what actually prevents a double-approve.
 */
export async function approveVendorPayout(payoutRequestId: string, adminId: string): Promise<{ error?: string }> {
  const { count } = await prisma.payoutRequest.updateMany({
    where: { id: payoutRequestId, status: "PENDING" },
    data: { status: "PAID", processedAt: new Date(), processedById: adminId },
  });
  if (count === 0) {
    return { error: "Yêu cầu này đã được xử lý trước đó." };
  }

  const payoutRequest = await prisma.payoutRequest.findUnique({ where: { id: payoutRequestId } });
  if (!payoutRequest) return {};

  const financeEntry = await prisma.financeEntry.create({
    data: {
      type: "EXPENSE",
      category: "COMMISSION_PAYOUT",
      amount: payoutRequest.amount,
      note: `Trả hoa hồng cho nhà bán hàng (yêu cầu #${payoutRequest.id})`,
      occurredAt: new Date(),
      createdById: adminId,
    },
  });

  await prisma.$transaction([
    prisma.payoutRequest.update({ where: { id: payoutRequestId }, data: { financeEntryId: financeEntry.id } }),
    prisma.commission.updateMany({ where: { payoutRequestId }, data: { status: "PAID" } }),
  ]);

  return {};
}

/** Admin rejects a payout request (e.g. wrong bank info on file) — releases every reserved row back into the vendor's available balance. */
export async function rejectVendorPayout(
  payoutRequestId: string,
  adminId: string,
  reason: string
): Promise<{ error?: string }> {
  const { count } = await prisma.payoutRequest.updateMany({
    where: { id: payoutRequestId, status: "PENDING" },
    data: { status: "REJECTED", processedAt: new Date(), processedById: adminId, rejectReason: reason },
  });
  if (count === 0) {
    return { error: "Yêu cầu này đã được xử lý trước đó." };
  }
  await prisma.$transaction([
    prisma.commission.updateMany({ where: { payoutRequestId }, data: { payoutRequestId: null } }),
    prisma.commissionAdjustment.updateMany({
      where: { settledInPayoutRequestId: payoutRequestId },
      data: { settledInPayoutRequestId: null },
    }),
  ]);
  return {};
}
