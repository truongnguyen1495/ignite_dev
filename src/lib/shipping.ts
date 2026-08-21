import type { OrderItemKind } from "@prisma/client";

/**
 * What delivery costs, and when it stops costing anything.
 *
 * Pure functions over two numbers an admin controls (Settings.shippingFee
 * and Settings.freeShippingFromItems), kept out of both the checkout action
 * and the checkout form so the price the buyer is shown and the price the
 * order actually charges can never drift apart — they call the same
 * function on the same two inputs.
 */
export type ShippingPolicy = {
  /** Flat delivery charge in đồng, applied once per order. */
  fee: number;
  /** Buy this many physical units and delivery is free. 0 disables it. */
  freeFromItems: number;
};

/**
 * How many physical units an order/cart holds — the number the free-
 * shipping threshold counts against.
 *
 * Counts units, not lines: three of the same card deck is three, exactly
 * like three different ones, because what makes delivery worth waiving is
 * the size of the sale and not how many distinct SKUs it spans. Digital
 * lines contribute nothing — they aren't in the parcel.
 */
export function countPhysicalUnits(items: { kind: OrderItemKind; quantity: number }[]): number {
  return items.reduce((sum, item) => (item.kind === "PRODUCT" ? sum + item.quantity : sum), 0);
}

/**
 * The delivery charge for an order holding `physicalUnits` physical units.
 *
 * Zero for a digital-only order (nothing ships), zero once the threshold is
 * reached, and the flat fee otherwise. Never negative, whatever an admin
 * typed into Settings.
 */
export function computeShippingFee(policy: ShippingPolicy, physicalUnits: number): number {
  if (physicalUnits <= 0) return 0;
  if (policy.freeFromItems > 0 && physicalUnits >= policy.freeFromItems) return 0;
  return Math.max(0, Math.round(policy.fee));
}

/**
 * How many more units the buyer needs for free delivery, or 0 when there is
 * nothing to nudge about — the offer is off, they already qualify, or the
 * order has nothing physical in it.
 *
 * Returned as a number rather than a sentence so the caller owns the
 * wording (the checkout summary phrases it one way, an order recap another)
 * and neither has to parse a string to know whether to render anything.
 */
export function unitsUntilFreeShipping(policy: ShippingPolicy, physicalUnits: number): number {
  if (physicalUnits <= 0 || policy.freeFromItems <= 0) return 0;
  return Math.max(0, policy.freeFromItems - physicalUnits);
}
