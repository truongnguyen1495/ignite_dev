import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatOrderCode, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_COLOR } from "@/lib/orders";
import { formatDateVN } from "@/lib/date";

export default async function OrdersPage() {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard");
  const orders = await prisma.order.findMany({
    where: { studentId: student.id, deletedAt: null },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader title="Đơn hàng của tôi" />

      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Bạn chưa có đơn hàng nào.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{formatOrderCode(order.orderNumber)}</p>
                  <Badge color={ORDER_STATUS_BADGE_COLOR[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                <p className="truncate text-sm text-muted">
                  {order.items.map((i) => i.titleSnapshot).join(", ")}
                </p>
                <p className="text-xs text-muted">{formatDateVN(order.createdAt)}</p>
              </div>
              <p className="shrink-0 font-medium text-foreground">{formatVND(order.totalAmount)}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
