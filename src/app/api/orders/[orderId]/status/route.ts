import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { expirePendingOrderIfNeeded } from "@/lib/order-expiry";

// Polled by the buyer's order page while the order is still PENDING (see
// order-status-poller.tsx), so a webhook-confirmed payment or an admin's
// manual confirm appears on its own.
//
// This route exists to replace a router.refresh() loop, which re-rendered
// the WHOLE route — dashboard layout included, and that layout runs seven
// queries in a Promise.all that does not parallelize under
// connection_limit=1. Measured against the live database: 4690ms of
// database work per tick at a 5s interval, i.e. one buyer sitting on the
// payment screen kept the single connection busy almost continuously and
// every other request in the app queued behind them. The one query below
// costs ~441ms, so a faster 3s poll is still an order of magnitude cheaper.
//
// It also gives an idle tab the quickest path to noticing its own deadline
// passed — expirePendingOrderIfNeeded runs here too, so the flip to
// CANCELLED shows up within one tick rather than on the buyer's next
// navigation.
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  // Plain auth() + manual checks rather than requireActiveStudent(), which
  // REDIRECTS to /login on failure. That is right for a page and wrong here:
  // the poller would receive a login page as its "JSON", parse-fail, and
  // retry forever every 3s. Same shape as every other API route in this app.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const student = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!student || student.status !== "ACTIVE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, studentId: true, deletedAt: true, paymentDeadline: true },
  });
  // Same 404-for-someone-else's-order rule the page itself applies: never
  // confirm that an order id exists to anyone but its owner.
  if (!order || order.studentId !== student.id || order.deletedAt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (await expirePendingOrderIfNeeded(order)) {
    return NextResponse.json({ status: "CANCELLED" });
  }
  return NextResponse.json({ status: order.status });
}
