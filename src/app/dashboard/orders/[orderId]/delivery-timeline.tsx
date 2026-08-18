import { Check } from "lucide-react";
import { formatDateVN } from "@/lib/date";
import type { DeliveryStage } from "@/lib/order-action-flags";

type Step = {
  key: DeliveryStage | "paid";
  label: string;
  at: Date | null;
  /**
   * Finished without a time of its own. "Đang đóng gói" is the only such
   * step: it is complete once the parcel ships, but it has no timestamp —
   * borrowing shippedAt would print the same clock time twice in a row and
   * read as if two things happened at the same instant.
   */
  doneWithoutTime?: boolean;
  hint?: string;
};

/**
 * Replaces the single line this page used to end on — "Đơn hàng đang được
 * đóng gói và sẽ sớm giao đến tay bạn nhé" — with the actual milestones and
 * the times they happened.
 *
 * A step with no timestamp is drawn as still ahead. The order deliberately
 * differs between payment methods: a transfer is paid before anything is
 * packed, while a pay-on-delivery parcel goes out first and is paid last,
 * which is what the buyer sees here too.
 */
export function DeliveryTimeline({
  stage,
  isCod,
  paidAt,
  shippedAt,
  deliveredAt,
  carrier,
  trackingCode,
}: {
  stage: Exclude<DeliveryStage, null>;
  isCod: boolean;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  carrier: string | null;
  trackingCode: string | null;
}) {
  const steps: Step[] = isCod
    ? [
        { key: "packing", label: "Đang chuẩn bị hàng", at: null, doneWithoutTime: Boolean(shippedAt) },
        { key: "shipped", label: "Đã gửi hàng", at: shippedAt },
        { key: "delivered", label: "Đã giao", at: deliveredAt },
        { key: "paid", label: "Đã thu tiền", at: paidAt, hint: "Trả tiền mặt khi nhận hàng" },
      ]
    : [
        { key: "paid", label: "Đã thanh toán", at: paidAt },
        { key: "packing", label: "Đang đóng gói", at: null, doneWithoutTime: Boolean(shippedAt) },
        { key: "shipped", label: "Đã gửi hàng", at: shippedAt },
        { key: "delivered", label: "Đã giao", at: deliveredAt },
      ];

  // The first step with no time yet is the one currently in progress; the
  // "đang đóng gói" row is the exception — it is happening precisely while
  // it has no timestamp of its own.
  const currentIndex = steps.findIndex((step) => !step.at && !step.doneWithoutTime);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Tình trạng giao hàng</h2>
        {stage === "delivered" && <span className="text-xs font-medium text-success">Hoàn tất</span>}
      </div>

      {(carrier || trackingCode) && (
        <dl className="space-y-1.5 rounded-lg border border-border bg-surface-hover px-3 py-2.5 text-sm">
          {carrier && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Đơn vị vận chuyển</dt>
              <dd className="text-right text-foreground">{carrier}</dd>
            </div>
          )}
          {trackingCode && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Mã vận đơn</dt>
              <dd className="text-right font-mono font-semibold text-primary">{trackingCode}</dd>
            </div>
          )}
        </dl>
      )}

      <ol className="space-y-0">
        {steps.map((step, index) => {
          const done = Boolean(step.at) || Boolean(step.doneWithoutTime);
          const current = !done && index === currentIndex;
          const last = index === steps.length - 1;
          return (
            <li key={`${step.key}-${index}`} className="grid grid-cols-[18px_1fr] gap-3">
              <span className="relative flex justify-center">
                {!last && (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 top-4 w-0.5 ${done ? "bg-success" : "bg-border"}`}
                  />
                )}
                <span
                  className={`relative z-10 mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                    done
                      ? "border-success bg-success text-on-dark-strong"
                      : current
                        ? "border-primary bg-primary shadow-[0_0_0_3px_var(--color-primary-bg)]"
                        : "border-border-strong bg-surface"
                  }`}
                >
                  {done && <Check className="h-2 w-2" strokeWidth={4} />}
                </span>
              </span>
              <span className={`pb-4 ${last ? "pb-0" : ""}`}>
                <span
                  className={`block text-sm font-medium ${done || current ? "text-foreground" : "text-muted"}`}
                >
                  {step.label}
                </span>
                <span className="block text-xs text-muted">
                  {step.at
                    ? formatDateVN(step.at)
                    : step.doneWithoutTime
                      ? "Đã xong"
                      : current
                        ? "Đang xử lý"
                        : (step.hint ?? "Chưa tới bước này")}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
