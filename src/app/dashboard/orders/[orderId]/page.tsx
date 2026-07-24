import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, CheckCircle2, ArrowRight, BookOpen, Video } from "lucide-react";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatOrderCode, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_COLOR } from "@/lib/orders";
import { buildVietQrImageUrl } from "@/lib/vietqr";
import { CancelOrderButton } from "./cancel-order-button";
import { ReorderButton } from "./reorder-button";
import { OrderStatusPoller } from "./order-status-poller";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard");
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          course: { select: { coverImageUrl: true, description: true, _count: { select: { lessons: true } } } },
          libraryItem: { select: { coverImageUrl: true, description: true, author: true, pageCount: true } },
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
      <OrderStatusPoller status={order.status} />
      <div>
        <BackLink href="/dashboard/orders">Đơn hàng của tôi</BackLink>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{formatOrderCode(order.orderNumber)}</h1>
          <Badge color={ORDER_STATUS_BADGE_COLOR[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          {order.status === "CANCELLED" && <ReorderButton orderId={order.id} />}
        </div>
      </div>

      {order.status === "PAID" && (
        <Card className="flex items-center gap-3 border-success-border bg-success-bg">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
          <div>
            <p className="font-semibold text-foreground">Thanh toán thành công!</p>
            <p className="text-sm text-muted">
              Đơn {formatOrderCode(order.orderNumber)} — {formatVND(order.totalAmount)}
            </p>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Sản phẩm</h2>
        <ul className="space-y-3">
          {order.items.map((item) => {
            const imageUrl = item.product?.imageUrl ?? item.course?.coverImageUrl ?? item.libraryItem?.coverImageUrl;
            const description = item.product?.subtitle ?? item.product?.description ?? item.course?.description ?? item.libraryItem?.description;
            // Once PAID, a COURSE/LIBRARY_ITEM item gets the same "unlocked
            // content" card look as the real course/library grid (see
            // library-list.tsx's list-mode row) instead of a plain text
            // link — same dark-card tokens, just always "Đã mở khóa" since
            // there's no lock/purchase state left to represent here.
            const unlockedHref =
              order.status === "PAID" && item.kind === "COURSE" && item.courseId
                ? `/dashboard/courses/${item.courseId}`
                : order.status === "PAID" && item.kind === "LIBRARY_ITEM" && item.libraryItemId
                  ? `/dashboard/library/${item.libraryItemId}`
                  : null;
            const unlockedMeta =
              item.kind === "COURSE"
                ? `${item.course?._count.lessons ?? 0} bài học`
                : [item.libraryItem?.author, item.libraryItem?.pageCount ? `${item.libraryItem.pageCount} trang` : null]
                    .filter(Boolean)
                    .join(" · ") || undefined;
            const UnlockedIcon = item.kind === "COURSE" ? Video : BookOpen;

            return (
              <li key={item.id} className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
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
                </div>
                {unlockedHref && (
                  <Link
                    href={unlockedHref}
                    className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-surface p-3 transition-colors hover:border-primary/60"
                  >
                    <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-lg bg-dark-surface-raised">
                      {imageUrl ? (
                        <Image src={imageUrl} alt={item.titleSnapshot} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UnlockedIcon className="h-6 w-6 text-on-dark-strong" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge color="success">Đã mở khóa</Badge>
                      <p className="mt-1 truncate font-semibold text-dark-foreground">{item.titleSnapshot}</p>
                      {unlockedMeta && <p className="truncate text-xs text-dark-muted">{unlockedMeta}</p>}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-indigo-400">
                      {item.kind === "COURSE" ? "Vào học" : "Đọc"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                )}
                {order.status === "PAID" && item.kind === "PRODUCT" && (
                  <p className="text-xs text-muted">
                    Sản phẩm &quot;{item.titleSnapshot}&quot; đang được đóng gói và vận chuyển đến tay bạn sớm
                    thôi nhé. Bạn vui lòng đợi vài ngày nhé.
                  </p>
                )}
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
          {(() => {
            // Dynamic per-order QR (amount + content pre-filled) takes
            // priority — falls back to the static admin-uploaded QR only
            // when bankName doesn't match a known VietQR bank yet (e.g. an
            // admin hasn't re-selected it from the new dropdown) or no
            // account number is set at all.
            const dynamicQrUrl = settings
              ? buildVietQrImageUrl({
                  bankName: settings.bankName,
                  accountNumber: settings.bankAccountNumber,
                  accountHolder: settings.bankAccountHolder,
                  amount: order.totalAmount,
                  content: formatOrderCode(order.orderNumber),
                })
              : null;
            const qrUrl = dynamicQrUrl ?? settings?.bankQrImageUrl;
            return (
              qrUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="Mã QR chuyển khoản"
                  className="mx-auto h-48 w-48 rounded-lg border border-border object-contain"
                />
              )
            );
          })()}
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
