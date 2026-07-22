import Image from "next/image";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
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

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          course: { select: { coverImageUrl: true, description: true } },
          libraryItem: { select: { coverImageUrl: true, description: true } },
          product: { select: { imageUrl: true, subtitle: true, description: true } },
        },
      },
    },
  });
  if (!order || order.studentId !== student.id || order.deletedAt) {
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
        <ul className="space-y-3">
          {order.items.map((item) => {
            const imageUrl = item.product?.imageUrl ?? item.course?.coverImageUrl ?? item.libraryItem?.coverImageUrl;
            const description = item.product?.subtitle ?? item.product?.description ?? item.course?.description ?? item.libraryItem?.description;
            return (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={item.titleSnapshot} fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-5 w-5 text-muted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{item.titleSnapshot}</p>
                  {description && <p className="line-clamp-2 text-xs text-muted">{description}</p>}
                </div>
                <span className="shrink-0 text-muted">{formatVND(item.priceAtPurchase)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-medium">
          <span className="text-foreground">Tổng cộng</span>
          <span className="text-foreground">{formatVND(order.totalAmount)}</span>
        </div>
      </Card>

      {order.shippingAddress && (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Thông tin giao hàng</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Người nhận</dt>
              <dd className="text-right text-foreground">{order.shippingName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Số điện thoại</dt>
              <dd className="text-right text-foreground">{order.shippingPhone}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Địa chỉ</dt>
              <dd className="text-right text-foreground">{order.shippingAddress}</dd>
            </div>
          </dl>
        </Card>
      )}

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
