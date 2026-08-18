"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { OrderCancelReason } from "@prisma/client";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { formatOrderCode } from "@/lib/orders";
import { ADMIN_ORDER_CANCEL_REASONS, ORDER_CANCEL_REASON_LABELS } from "@/lib/order-cancel-labels";
import { cancelOrderAction } from "./actions";

/**
 * Cancelling used to be a plain yes/no confirm, which left "Đã hủy" and
 * nothing else behind — the buyer never learned why and neither did the next
 * admin to open the list. The reason is now required; the note is not.
 *
 * The warning at the bottom is the important part: an admin cancelling by
 * hand is a decision that cannot be walked back, unlike the automatic
 * expiry, which exists precisely so late money has a way in. Saying so here
 * is cheaper than explaining it afterwards.
 */
export function CancelOrderModal({
  orderId,
  orderNumber,
  studentName,
  onClose,
}: {
  orderId: string;
  orderNumber: number;
  studentName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<OrderCancelReason>(ADMIN_ORDER_CANCEL_REASONS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await cancelOrderAction(orderId, reason, note);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <ModalShell onClose={onClose} labelledBy="cancel-order-title">
      <h2 id="cancel-order-title" className="text-base font-semibold text-foreground">
        Hủy đơn {formatOrderCode(orderNumber)}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Của {studentName}. Thành viên sẽ không được cấp quyền từ đơn này.
      </p>

      <div className="mt-4 space-y-4">
        <Select
          id="cancel-reason"
          label="Lý do hủy"
          value={reason}
          onChange={(e) => setReason(e.target.value as OrderCancelReason)}
        >
          {ADMIN_ORDER_CANCEL_REASONS.map((value) => (
            <option key={value} value={value}>
              {ORDER_CANCEL_REASON_LABELS[value]}
            </option>
          ))}
        </Select>
        <Textarea
          id="cancel-note"
          label="Ghi chú (tùy chọn)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint="Thành viên đọc được ghi chú này ở trang đơn hàng của họ."
        />
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-xs text-warning">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Đơn admin tự hủy sẽ <span className="font-semibold">không mở lại được</span> — khác với đơn
          hệ thống hủy do quá hạn.
        </span>
      </p>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Quay lại
        </Button>
        <Button type="button" variant="danger" onClick={submit} isLoading={pending} disabled={pending}>
          Hủy đơn
        </Button>
      </div>
    </ModalShell>
  );
}
