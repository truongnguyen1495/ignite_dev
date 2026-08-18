import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/access";
import { downloadOrderProof } from "@/lib/order-proof-storage";

// Admin-only, deliberately. A payment proof is a screenshot of the company's
// own bank notification — internal evidence that an admin confirmed against,
// not a receipt for the buyer. The buyer's own page shows only that the
// payment was confirmed and when.
//
// Plain auth() + manual checks rather than the redirect-based requireXxx
// helpers, because this is fetched as an image source and needs a JSON/status
// failure, not a redirect to a login page. Mirrors the chat attachment route.
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await hasAdminPermission(user, "MANAGE_ORDERS"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { paymentProofPath: true },
  });
  if (!order?.paymentProofPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await downloadOrderProof(order.paymentProofPath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      // Sniffing disabled: the bytes were signature-checked at upload, and
      // the browser must not be free to reinterpret them as something else.
      "Content-Type": order.paymentProofPath.endsWith(".png")
        ? "image/png"
        : order.paymentProofPath.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
