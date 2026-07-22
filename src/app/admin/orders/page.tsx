import { requireAdminPermission, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateVN } from "@/lib/date";
import { OrdersList, type OrderListItem } from "./orders-list";

export default async function AdminOrdersPage() {
  await requireAdminPermission("MANAGE_ORDERS");
  await requireSalesEnabled("/admin/settings");

  const orders = await prisma.order.findMany({
    include: {
      student: { select: { name: true, email: true } },
      items: {
        include: {
          courseAccessGrant: { select: { id: true } },
          libraryAccessGrant: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items: OrderListItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAtLabel: formatDateVN(order.createdAt),
    studentName: order.student.name,
    studentEmail: order.student.email,
    items: order.items.map((i) => ({
      id: i.id,
      title: i.titleSnapshot,
      hasActiveGrant: !!i.courseAccessGrant || !!i.libraryAccessGrant,
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn hàng"
        description="Đơn mua khóa học độc quyền/tài liệu thư viện qua chuyển khoản ngân hàng."
      />
      <OrdersList orders={items} />
    </div>
  );
}
