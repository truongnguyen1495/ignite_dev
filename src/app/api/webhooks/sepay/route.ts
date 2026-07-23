import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAutoPaymentEnabled } from "@/lib/access";
import { fulfillOrder } from "@/lib/order-fulfillment";
import { parseOrderNumberFromContent } from "@/lib/orders";

// Public, unauthenticated-by-session endpoint — SePay calls this server-to-
// server, there's no student/admin session involved, so this route lives
// outside every other auth boundary in the app (deliberately not covered by
// src/middleware.ts's matcher). The only gate is the shared secret below.
//
// Always responds 200 + {"success": true} once the caller is authenticated,
// even when the transaction doesn't match any order or auto-payment is
// toggled off — per SePay's webhook contract, anything else triggers
// Fibonacci-backoff retries for up to 5 hours, which would be pointless for
// a transaction that will never match anything in our system. A 401 (bad/
// missing secret, missing/invalid signature) is the one case left to
// actually fail loudly.
//
// HMAC-SHA256 per SePay's own "Xác thực HMAC-SHA256" spec (Webhooks →
// Bảo mật dashboard panel): SePay signs `${timestamp}.${rawBody}` with the
// configured secret and sends the result as `sha256=<hex>` in
// X-SePay-Signature, plus the raw unix-seconds timestamp in
// X-SePay-Timestamp. Must hash the *raw* request body text, not
// JSON.stringify(parsedPayload) — those can differ byte-for-byte (key
// order, whitespace) and would silently break every signature.
//
// No timestamp-freshness/replay-window check here on purpose: SePay retries
// a failed delivery for up to 5 hours (Fibonacci backoff), reusing the
// original event's timestamp/signature, so rejecting "old" timestamps would
// break their own retry mechanism. This is safe to skip because a replayed
// webhook is harmless anyway — fulfillOrder only ever acts once per order
// (guarded by the `status: PENDING` condition inside its own updateMany),
// so re-delivering (or replaying) a signature for an already-PAID order is
// just a no-op, not a real risk.
function isAuthorized(rawBody: string, request: Request): boolean {
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!secret) return false; // never authenticate anything if unconfigured

  const signature = request.headers.get("x-sepay-signature");
  const timestamp = request.headers.get("x-sepay-timestamp");
  if (!signature || !timestamp) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;

  // Compare digests rather than the raw strings so timingSafeEqual never
  // sees mismatched buffer lengths (it throws on that instead of just
  // returning false), while still avoiding a timing side-channel on the
  // real signature.
  const a = createHash("sha256").update(signature).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

interface SepayWebhookPayload {
  transferType?: string;
  transferAmount?: number;
  content?: string;
}

export async function POST(request: Request) {
  // Read the raw body text once — needed verbatim for the HMAC check below,
  // and reused for JSON.parse right after (a Request's body can only be
  // consumed once, so this must happen before anything else touches it).
  const rawBody = await request.text();

  if (!isAuthorized(rawBody, request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SepayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: true });
  }

  // Only "money in" transactions are ever relevant to order fulfillment.
  if (payload.transferType !== "in" || !payload.content || typeof payload.transferAmount !== "number") {
    return NextResponse.json({ success: true });
  }

  if (!(await isAutoPaymentEnabled())) {
    return NextResponse.json({ success: true });
  }

  const orderNumber = parseOrderNumberFromContent(payload.content);
  if (orderNumber === null) {
    return NextResponse.json({ success: true });
  }

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  // Only auto-fulfill on an exact amount match, still-pending, non-deleted
  // order — anything else (underpaid/overpaid, already handled, soft-
  // deleted) is left for an admin to sort out manually via the existing
  // confirmOrderPaidAction, same as before this feature existed.
  if (
    !order ||
    order.deletedAt ||
    order.status !== "PENDING" ||
    order.totalAmount !== payload.transferAmount
  ) {
    return NextResponse.json({ success: true });
  }

  await fulfillOrder(order.id, null);
  return NextResponse.json({ success: true });
}
