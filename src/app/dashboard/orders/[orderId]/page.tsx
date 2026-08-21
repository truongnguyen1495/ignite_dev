import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Package,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Video,
  AlertTriangle,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { requireActiveStudent, requireSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/ui/copy-field";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import { formatOrderCode, orderItemTotal, ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_COLOR } from "@/lib/orders";
import { expirePendingOrderIfNeeded } from "@/lib/order-expiry";
import { ORDER_CANCEL_REASON_BUYER_LABELS, isAutoCancelledOrder } from "@/lib/order-cancel-labels";
import { deliveryStage } from "@/lib/order-action-flags";
import { REFUND_REASON_LABELS } from "@/lib/refund-labels";
import { buildVietQrImageUrl } from "@/lib/vietqr";
import { CancelOrderButton } from "./cancel-order-button";
import { ReorderButton } from "./reorder-button";
import { OrderStatusPoller } from "./order-status-poller";
import { OrderExpiryCountdown } from "./order-expiry-countdown";
import { DeliveryTimeline } from "./delivery-timeline";
import { OrderThanks } from "./order-thanks";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const student = await requireActiveStudent();
  await requireSalesEnabled("/dashboard");
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      refunds: {
        where: { deletedAt: null },
        orderBy: { refundedAt: "desc" },
        select: { id: true, amount: true, reason: true, note: true, refundedAt: true },
      },
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

  // Opportunistic, because this app has no cron — see the function's own
  // comment. When it fires, the row in hand is one render stale, so read the
  // new status from here rather than re-fetching the whole order.
  const justExpired = await expirePendingOrderIfNeeded(order);
  const status = justExpired ? "CANCELLED" : order.status;
  const cancelReason = justExpired ? "SYSTEM_EXPIRED" : order.cancelReason;

  const settings = status === "PENDING" ? await prisma.settings.findUnique({ where: { id: 1 } }) : null;
  const autoCancelled = isAutoCancelledOrder(status, cancelReason);

  const hasPhysicalItems = order.items.some((item) => item.kind === "PRODUCT");
  const stage = deliveryStage({ hasPhysicalItems, status, shippedAt: order.shippedAt, deliveredAt: order.deliveredAt });
  const refundedTotal = order.refunds.reduce((sum, refund) => sum + refund.amount, 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <OrderStatusPoller status={status} orderId={order.id} />
      <div>
        <BackLink href="/dashboard/orders">Đơn hàng của tôi</BackLink>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{formatOrderCode(order.orderNumber)}</h1>
          <Badge color={ORDER_STATUS_BADGE_COLOR[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
          {status === "CANCELLED" && <ReorderButton orderId={order.id} />}
        </div>
      </div>

      <OrderThanks
        status={status}
        paymentMethod={order.paymentMethod}
        orderCode={formatOrderCode(order.orderNumber)}
        totalAmount={order.totalAmount}
        hasPhysicalItems={hasPhysicalItems}
        hasDigitalItems={order.items.some((item) => item.kind !== "PRODUCT")}
      />

      {status === "PAID" && (
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

      {/* Once PAID, all pricing moves here — one clean invoice-style card —
          instead of being scattered per-item across the "Sản phẩm" and
          "Thông tin giao hàng" cards below (which, for a PAID order, drop
          their own price/Tổng cộng lines entirely; see their filters). Only
          for PAID: PENDING/CANCELLED keep the old mixed layout with prices
          shown inline, per user decision. */}
      {status === "PAID" && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Hóa đơn</h2>
            {order.paidAt && <span className="text-xs text-muted">{formatDateVN(order.paidAt)}</span>}
          </div>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-foreground">
                  {item.titleSnapshot}
                  {item.quantity > 1 && <span className="text-muted"> × {item.quantity}</span>}
                </span>
                <span className="shrink-0 text-muted">{formatVND(orderItemTotal(item))}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-border pt-3 text-sm">
            {/* Delivery is only itemised for an order that had something to
                deliver — and then always, including when it came out free,
                so a buyer who earned free shipping can see that they did. */}
            {hasPhysicalItems && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Tiền hàng</span>
                  <span className="tabular-nums text-muted">
                    {formatVND(order.totalAmount - order.shippingFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Phí vận chuyển</span>
                  <span className="tabular-nums text-muted">
                    {order.shippingFee === 0 ? "Miễn phí" : formatVND(order.shippingFee)}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-3 font-medium">
              <span className="text-foreground">Tổng cộng</span>
              <span className="tabular-nums text-foreground">{formatVND(order.totalAmount)}</span>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Sản phẩm</h2>
        <ul className="space-y-3">
          {order.items
            // Once PAID, a PRODUCT item moves into the "Thông tin giao hàng"
            // card below instead — course/library are "đã mở khóa" (digital,
            // nothing to ship), so grouping them apart from a physical item
            // that's about to be packed and shipped reads clearer than
            // mixing both under one plain "Sản phẩm" list. Left mixed for
            // PENDING/CANCELLED (per user decision — those states have no
            // "sắp giao hàng" story to tell yet anyway).
            .filter((item) => !(status === "PAID" && item.kind === "PRODUCT"))
            .map((item) => {
            const imageUrl = item.product?.imageUrl ?? item.course?.coverImageUrl ?? item.libraryItem?.coverImageUrl;
            const description = item.product?.subtitle ?? item.product?.description ?? item.course?.description ?? item.libraryItem?.description;
            // Once PAID, a COURSE/LIBRARY_ITEM item gets the same "unlocked
            // content" card look as the real course/library grid (see
            // library-list.tsx's list-mode row) instead of a plain text
            // link — same dark-card tokens, just always "Đã mở khóa" since
            // there's no lock/purchase state left to represent here.
            const unlockedHref =
              status === "PAID" && item.kind === "COURSE" && item.courseId
                ? `/dashboard/courses/${item.courseId}`
                : status === "PAID" && item.kind === "LIBRARY_ITEM" && item.libraryItemId
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
                  {/* Price now lives only in the "Hóa đơn" card above, once
                      PAID — this list is purely "what you got" then. */}
                  {status !== "PAID" && (
                    <span className="shrink-0 text-right text-muted">
                      {formatVND(orderItemTotal(item))}
                      {item.quantity > 1 && (
                        <span className="block text-xs text-faint">
                          {item.quantity} × {formatVND(item.priceAtPurchase)}
                        </span>
                      )}
                    </span>
                  )}
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
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary">
                      {item.kind === "COURSE" ? "Vào học" : "Đọc"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        {/* Grand total now lives only in the "Hóa đơn" card above, once PAID. */}
        {status !== "PAID" && (
          <div className="space-y-2 border-t border-border pt-3 text-sm">
            {hasPhysicalItems && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Tiền hàng</span>
                  <span className="tabular-nums text-muted">
                    {formatVND(order.totalAmount - order.shippingFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Phí vận chuyển</span>
                  <span className="tabular-nums text-muted">
                    {order.shippingFee === 0 ? "Miễn phí" : formatVND(order.shippingFee)}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-3 font-medium">
              <span className="text-foreground">Tổng cộng</span>
              <span className="tabular-nums text-foreground">{formatVND(order.totalAmount)}</span>
            </div>
          </div>
        )}
      </Card>

      {order.shippingAddress && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Thông tin giao hàng</h2>
          {/* Physical items themselves only show here once PAID (see the
              matching filter on the "Sản phẩm" list above) — for
              PENDING/CANCELLED they're still listed there instead, unchanged. */}
          {status === "PAID" && (
            <ul className="space-y-2 border-b border-border pb-3">
              {order.items
                .filter((item) => item.kind === "PRODUCT")
                .map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
                      {item.product?.imageUrl ? (
                        <Image src={item.product.imageUrl} alt={item.titleSnapshot} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-muted" />
                        </div>
                      )}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-foreground">
                      {item.titleSnapshot}
                      {item.quantity > 1 && (
                        <span className="text-muted"> × {item.quantity}</span>
                      )}
                    </p>
                  </li>
                ))}
            </ul>
          )}
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

      {status === "PENDING" && (
        <Card className="space-y-4">
          {/* Order reversed from what this card used to be: the QR and the
              amount come first, because scanning is what almost everyone
              does, and the amount is the single number a buyer typing the
              transfer by hand has to get right. It used to appear nowhere on
              this card at all — only as "Tổng cộng" in the products card
              above, which meant scrolling back up mid-transfer. */}
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
                // White plate and padding are not decoration: the qr_only
                // image is a bare code with no quiet zone of its own, and a
                // scanner needs light margin around it — dropped straight
                // onto this navy card, the outer modules would bleed into
                // the background and phones would struggle to lock on.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="Mã QR chuyển khoản"
                  className="mx-auto h-56 w-56 rounded-xl bg-white p-3 object-contain sm:h-64 sm:w-64"
                />
              )
            );
          })()}

          <div className="text-center">
            <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
              {formatVND(order.totalAmount)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Quét mã bằng app ngân hàng — số tiền và nội dung đã điền sẵn.
            </p>
          </div>

          {order.paymentDeadline && <OrderExpiryCountdown deadline={order.paymentDeadline} />}

          {settings?.bankName || settings?.bankAccountNumber ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-faint">
                <span className="h-px flex-1 bg-border" />
                hoặc chuyển thủ công
                <span className="h-px flex-1 bg-border" />
              </div>
              {settings.bankName && (
                <CopyField label="Ngân hàng" value={settings.bankName} mono={false} />
              )}
              {settings.bankAccountNumber && (
                <CopyField label="Số tài khoản" value={settings.bankAccountNumber} />
              )}
              {settings.bankAccountHolder && (
                <CopyField label="Chủ tài khoản" value={settings.bankAccountHolder} mono={false} />
              )}
              <CopyField
                label="Nội dung chuyển khoản"
                value={formatOrderCode(order.orderNumber)}
                highlight
              />
              <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Ghi <span className="font-semibold">đúng</span> nội dung này thì đơn tự xác nhận
                  trong vài giây. Ghi sai vẫn nhận được tiền, nhưng phải chờ admin đối soát tay.
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">Chưa có thông tin chuyển khoản, vui lòng liên hệ admin.</p>
          )}

          <div className="flex justify-end border-t border-border pt-3">
            <CancelOrderButton orderId={order.id} orderNumber={order.orderNumber} />
          </div>
        </Card>
      )}

      {/* Pay-on-delivery has nothing to show a QR for and no clock to run —
          the money moves when the courier hands the parcel over. What the
          buyer needs here is the amount to have ready and the reassurance
          that nothing is owed until then. */}
      {status === "AWAITING_COD" && (
        <Card className="space-y-3 border-info-border bg-info-bg">
          <p className="text-sm font-semibold text-foreground">Thanh toán khi nhận hàng</p>
          <p className="text-sm text-muted">
            Bạn chưa phải trả gì lúc này. Chuẩn bị sẵn{" "}
            <span className="font-semibold text-foreground">{formatVND(order.totalAmount)}</span> tiền
            mặt để đưa cho người giao hàng.
          </p>
          <p className="text-xs text-muted">
            Đơn này không có hạn thanh toán — nó chỉ đóng lại khi hàng được giao và nhận đủ tiền.
          </p>
          <div className="flex justify-end border-t border-info-border pt-3">
            <CancelOrderButton orderId={order.id} orderNumber={order.orderNumber} />
          </div>
        </Card>
      )}

      {stage && (
        <DeliveryTimeline
          stage={stage}
          isCod={order.paymentMethod === "COD"}
          paidAt={order.paidAt}
          shippedAt={order.shippedAt}
          deliveredAt={order.deliveredAt}
          deliveryNote={order.deliveryNote}
          carrier={order.carrier}
          trackingCode={order.trackingCode}
        />
      )}

      {/* Shown as its own record rather than by quietly reducing the order
          total: the buyer paid that amount, and some of it came back. Both
          facts belong on the page. */}
      {refundedTotal > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Đã hoàn tiền</h2>
            <span className="text-sm font-semibold text-foreground">{formatVND(refundedTotal)}</span>
          </div>
          <ul className="space-y-2 text-sm">
            {order.refunds.map((refund) => (
              <li key={refund.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-foreground">{REFUND_REASON_LABELS[refund.reason]}</span>
                  <span className="block text-xs text-muted">{formatDateVN(refund.refundedAt)}</span>
                  {refund.note && <span className="block text-xs text-muted">{refund.note}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-muted">{formatVND(refund.amount)}</span>
              </li>
            ))}
          </ul>
          {refundedTotal < order.totalAmount && (
            <p className="border-t border-border pt-3 text-xs text-muted">
              Đây là hoàn tiền một phần — phần còn lại của đơn vẫn giữ nguyên.
            </p>
          )}
        </Card>
      )}

      {/* A cancelled order used to say only "Đã hủy". It now says why, and —
          when the system did it on a timer rather than a person deciding —
          makes clear that a late transfer is recoverable, because it is:
          reviveOrderAction is exactly that path. */}
      {status === "CANCELLED" && (
        <Card className="space-y-3 border-danger-border bg-danger-bg">
          <p className="flex items-start gap-2.5 text-sm font-semibold text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            {cancelReason
              ? ORDER_CANCEL_REASON_BUYER_LABELS[cancelReason]
              : "Đơn hàng đã được hủy"}
          </p>
          {autoCancelled && (
            <>
              <p className="text-sm text-muted">
                Đơn được giữ trong một khoảng thời gian nhất định. Quá hạn mà chưa nhận được chuyển
                khoản, hệ thống tự hủy để không giữ hàng vô thời hạn.
              </p>
              <div className="flex flex-wrap items-start gap-2.5 rounded-lg border border-info-border bg-info-bg px-3 py-2.5 text-sm text-foreground">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <span className="min-w-0">
                  <span className="font-semibold">Bạn đã chuyển khoản rồi?</span> Tiền không mất.
                  Nhắn cho admin kèm mã{" "}
                  <span className="font-mono font-semibold">{formatOrderCode(order.orderNumber)}</span>,
                  đơn sẽ được mở lại và tính là đã thanh toán.
                </span>
              </div>
            </>
          )}
          {order.cancelNote && (
            <p className="border-t border-danger-border pt-3 text-sm text-muted">{order.cancelNote}</p>
          )}
        </Card>
      )}

      {/* Only ever set by reviveOrderAction. Without this the buyer would see
          a paid order carrying a cancellation timestamp and no explanation. */}
      {status === "PAID" && order.revivedAt && (
        <Card className="flex items-start gap-3 border-success-border bg-success-bg">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Đơn đã được mở lại</p>
            <p className="text-sm text-muted">
              Admin xác nhận đã nhận được chuyển khoản của bạn lúc {formatDateVN(order.revivedAt)}.
              Đơn hàng tiếp tục như bình thường.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
