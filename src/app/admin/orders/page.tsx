import { requireAdminPermission, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { Order, OrderItem, RefundReason, User } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateVN, toDateOnlyISOString } from "@/lib/date";
import { dateOnlyVN } from "@/lib/groups";
import { purgeExpiredDeletedOrders } from "@/lib/order-fulfillment";
import { expireOverduePendingOrders } from "@/lib/order-expiry";
import { activeRefundTotal } from "@/lib/refund-labels";
import { OrdersList, type OrderListItem } from "./orders-list";

type OrderWithRelations = Order & {
  student: Pick<User, "name" | "email">;
  items: (OrderItem & {
    courseAccessGrant: { id: string } | null;
    libraryAccessGrant: { id: string } | null;
  })[];
  refunds: { id: string; amount: number; reason: RefundReason; note: string | null; refundedAt: Date; deletedAt: Date | null }[];
};

function toListItem(order: OrderWithRelations): OrderListItem {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    cancelReason: order.cancelReason,
    totalAmount: order.totalAmount,
    shippingFee: order.shippingFee,
    // Summed here rather than in the client so a voided refund can't be
    // mistaken for money that moved — see activeRefundTotal.
    refundedTotal: activeRefundTotal(order.refunds),
    // Only the live rows: a voided refund is money that never moved, so it
    // must not appear in the list an admin voids things from.
    refunds: order.refunds
      .filter((refund) => refund.deletedAt === null)
      .map((refund) => ({
        id: refund.id,
        amount: refund.amount,
        reason: refund.reason,
        note: refund.note,
        refundedAtLabel: formatDateVN(refund.refundedAt),
      })),
    deliveryNote: order.deliveryNote,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    carrier: order.carrier,
    trackingCode: order.trackingCode,
    // Only whether one exists — the bytes are fetched on demand from an
    // admin-gated route, never inlined into the page payload.
    hasPaymentProof: Boolean(order.paymentProofPath),
    // VN-calendar-day key ("YYYY-MM-DD") a paid order's money landed on —
    // lets a "?date=" link from /admin/revenue's daily chart pick out the
    // exact same day an admin saw a bar for, without redoing timezone math
    // client-side. Null for an order that never got paid.
    paidAtDateVN: order.paidAt ? toDateOnlyISOString(dateOnlyVN(order.paidAt)) : null,
    createdAtLabel: formatDateVN(order.createdAt),
    studentName: order.student.name,
    studentEmail: order.student.email,
    shipping:
      order.shippingName || order.shippingPhone || order.shippingAddress
        ? {
            name: order.shippingName ?? "",
            phone: order.shippingPhone ?? "",
            address: order.shippingAddress ?? "",
          }
        : null,
    deletedAt: order.deletedAt,
    items: order.items.map((i) => ({
      id: i.id,
      title: i.titleSnapshot,
      kind: i.kind,
      // The catalog item's own id (Course/LibraryItem/Product), not this
      // OrderItem row's id — what a "?itemId=" link from the revenue page's
      // top-products table actually filters on, since the same course sold
      // across many orders needs one stable key to match against.
      refId: i.courseId ?? i.libraryItemId ?? i.productId ?? null,
      hasActiveGrant: !!i.courseAccessGrant || !!i.libraryAccessGrant,
    })),
  };
}

export default async function AdminOrdersPage() {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/settings");
  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  await purgeExpiredDeletedOrders();
  // Unscoped: this is the one page that sees every buyer's orders, so it's
  // where the whole backlog gets swept. Runs before the read below so the
  // list can't show a status the very next click contradicts.
  await expireOverduePendingOrders();

  const include = {
    student: { select: { name: true, email: true } },
    refunds: {
      orderBy: { refundedAt: "desc" },
      select: { id: true, amount: true, reason: true, note: true, refundedAt: true, deletedAt: true },
    },
    items: {
      include: {
        courseAccessGrant: { select: { id: true } },
        libraryAccessGrant: { select: { id: true } },
      },
    },
  } as const;

  const [orders, deletedOrders] = await Promise.all([
    prisma.order.findMany({ where: { deletedAt: null }, include, orderBy: { createdAt: "desc" } }),
    // Only a Super Admin can see/restore trashed orders — no point fetching
    // this for anyone else (matches who even sees the delete button).
    isSuperAdmin
      ? prisma.order.findMany({ where: { deletedAt: { not: null } }, include, orderBy: { deletedAt: "desc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn hàng"
        description="Đơn mua khóa học độc quyền/tài liệu thư viện/sản phẩm qua chuyển khoản ngân hàng."
      />
      <OrdersList
        orders={orders.map(toListItem)}
        deletedOrders={deletedOrders.map(toListItem)}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
