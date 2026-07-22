import { requireAdminPermission, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { Order, OrderItem, User } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateVN } from "@/lib/date";
import { purgeExpiredDeletedOrders } from "@/lib/order-fulfillment";
import { OrdersList, type OrderListItem } from "./orders-list";

type OrderWithRelations = Order & {
  student: Pick<User, "name" | "email">;
  items: (OrderItem & {
    courseAccessGrant: { id: string } | null;
    libraryAccessGrant: { id: string } | null;
  })[];
};

function toListItem(order: OrderWithRelations): OrderListItem {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
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
      hasActiveGrant: !!i.courseAccessGrant || !!i.libraryAccessGrant,
    })),
  };
}

export default async function AdminOrdersPage() {
  const admin = await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/settings");
  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  await purgeExpiredDeletedOrders();

  const include = {
    student: { select: { name: true, email: true } },
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
