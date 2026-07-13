import { notFound } from "next/navigation";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatOrderCode, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_COLOR } from "@/lib/orders";
import { CancelOrderButton } from "./cancel-order-button";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard");
  const { orderId } = await params;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.studentId !== student.id) {
    notFound();
  }

  const settings = order.status === "PENDING" ? await prisma.settings.findUnique({ where: { id: 1 } }) : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/dashboard/orders">Đơn hàng của tôi</BackLink>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{formatOrderCode(order.orderNumber)}</h1>
          <Badge color={ORDER_STATUS_BADGE_COLOR[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Sản phẩm</h2>
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-foreground">{item.titleSnapshot}</span>
              <span className="text-muted">{formatVND(item.priceAtPurchase)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-medium">
          <span className="text-foreground">Tổng cộng</span>
          <span className="text-foreground">{formatVND(order.totalAmount)}</span>
        </div>
      </Card>

      {order.status === "PENDING" && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Thông tin chuyển khoản</h2>
          {settings?.bankName || settings?.bankAccountNumber ? (
            <dl className="space-y-2 text-sm">
              {settings.bankName && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Ngân hàng</dt>
                  <dd className="text-right text-foreground">{settings.bankName}</dd>
                </div>
              )}
              {settings.bankAccountNumber && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Số tài khoản</dt>
                  <dd className="text-right text-foreground">{settings.bankAccountNumber}</dd>
                </div>
              )}
              {settings.bankAccountHolder && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Chủ tài khoản</dt>
                  <dd className="text-right text-foreground">{settings.bankAccountHolder}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Nội dung chuyển khoản</dt>
                <dd className="text-right font-semibold text-primary">{formatOrderCode(order.orderNumber)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted">Chưa có thông tin chuyển khoản, vui lòng liên hệ admin.</p>
          )}
          {settings?.bankQrImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.bankQrImageUrl}
              alt="Mã QR chuyển khoản"
              className="mx-auto h-48 w-48 rounded-lg border border-border object-contain"
            />
          )}
          <p className="text-xs text-muted">
            Sau khi chuyển khoản, vui lòng đợi admin xác nhận — trang này sẽ tự cập nhật trạng thái khi đơn
            được duyệt.
          </p>
          <div className="flex justify-end border-t border-border pt-3">
            <CancelOrderButton orderId={order.id} orderNumber={order.orderNumber} />
          </div>
        </Card>
      )}
    </div>
  );
}
