import type { OrderStatus, PaymentMethod } from "@prisma/client";
import { CheckCircle2, Landmark, Package, Phone, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatVND } from "@/lib/currency";

/**
 * The thank-you that opens a freshly placed order.
 *
 * It sits above the QR rather than replacing it, and it appears the moment
 * the order exists — not after the money lands. That timing is the whole
 * point: the buyer has just committed, and the two questions in their head
 * are "did that work?" and "what happens now?". Waiting for the transfer to
 * clear before saying anything leaves both unanswered for as long as it
 * takes a bank to move money, which is exactly when reassurance is worth
 * the most. When the money does arrive, the page swaps itself for the paid
 * state on its own (OrderStatusPoller), so nobody is left thanking someone
 * for an order that already completed.
 *
 * Shown only while an order is still waiting to be paid — a PAID order gets
 * the "Thanh toán thành công" banner instead, and a cancelled one has
 * nothing to be thanked for.
 */
export function OrderThanks({
  status,
  paymentMethod,
  orderCode,
  totalAmount,
  hasPhysicalItems,
  hasDigitalItems,
}: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  orderCode: string;
  totalAmount: number;
  hasPhysicalItems: boolean;
  hasDigitalItems: boolean;
}) {
  if (status !== "PENDING" && status !== "AWAITING_COD") return null;

  const payOnDelivery = paymentMethod === "COD";

  // What comes next is genuinely a sequence — one thing waits on the one
  // before it — so it is numbered by position and read top to bottom.
  const steps = payOnDelivery
    ? [
        {
          icon: Phone,
          title: "Nhân viên sẽ gọi lại xác nhận",
          detail:
            "Xác nhận số lượng, giá và địa chỉ giao trong giờ làm việc. Bạn không cần làm thêm bước nào.",
        },
        {
          icon: Package,
          title: "Nhận hàng, kiểm tra hộp rồi mới trả tiền",
          detail: `Chuẩn bị ${formatVND(totalAmount)} tiền mặt, hoặc chuyển khoản cho nhân viên giao hàng khi nhận.`,
        },
      ]
    : [
        {
          icon: Landmark,
          title: "Chuyển khoản theo thông tin bên dưới",
          detail:
            "Ghi đúng nội dung chuyển khoản thì đơn tự xác nhận trong vài giây — trang này tự cập nhật, bạn không cần tải lại.",
        },
        hasPhysicalItems
          ? {
              icon: Package,
              title: "Nhân viên gọi lại và giao hàng",
              detail:
                "Ngay khi nhận được thanh toán, đơn được chuyển cho bộ phận giao hàng và bạn theo dõi được từng chặng ngay tại trang này.",
            }
          : {
              icon: Sparkles,
              title: "Mở khoá ngay khi xác nhận",
              detail: hasDigitalItems
                ? "Khoá học và tài liệu trong đơn mở ra ngay lúc đơn được xác nhận, không phải chờ thêm."
                : "Đơn được xác nhận xong là hoàn tất.",
            },
      ];

  return (
    <div className="space-y-3">
      <Card className="flex items-start gap-3 border-success-border bg-success-bg">
        <CheckCircle2 className="h-7 w-7 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Cảm ơn bạn đã đặt hàng!</p>
          <p className="text-sm text-muted">
            Đơn <span className="font-semibold text-primary">{orderCode}</span> đã được ghi nhận. Bạn
            xem lại đơn này bất cứ lúc nào trong mục Đơn hàng của tài khoản.
          </p>
        </div>
      </Card>

      <ol className="overflow-hidden rounded-xl border border-border">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={`flex items-start gap-3 bg-surface p-4 ${index > 0 ? "border-t border-border" : ""}`}
          >
            <step.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
