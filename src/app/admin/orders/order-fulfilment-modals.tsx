"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Package, Truck, Undo2 } from "lucide-react";
import type { RefundReason } from "@prisma/client";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { formatVND } from "@/lib/currency";
import { formatOrderCode } from "@/lib/orders";
import { REFUND_REASONS, REFUND_REASON_LABELS } from "@/lib/refund-labels";
import {
  markOrderShippedAction,
  markOrderDeliveredAction,
  recordRefundAction,
  voidRefundAction,
  confirmOrderPaidAction,
} from "./actions";

/**
 * "Đã gửi hàng". Carrier and tracking code are both optional: a parcel
 * handed over in person has neither, and refusing to record the shipment
 * over a missing field would push the fact back into someone's memory.
 */
export function ShipOrderModal({
  orderId,
  orderNumber,
  shippingAddress,
  onClose,
}: {
  orderId: string;
  orderNumber: number;
  shippingAddress: string | null;
  onClose: () => void;
}) {
  const [carrier, setCarrier] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await markOrderShippedAction(orderId, carrier, trackingCode);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <ModalShell onClose={onClose} labelledBy="ship-title">
      <h2 id="ship-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Truck className="h-4 w-4 text-primary" />
        Đã gửi hàng — {formatOrderCode(orderNumber)}
      </h2>
      {shippingAddress && <p className="mt-1 text-sm text-muted">Giao đến: {shippingAddress}</p>}

      <div className="mt-4 space-y-4">
        <Input
          id="ship-carrier"
          label="Đơn vị vận chuyển (tùy chọn)"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="Giao Hàng Tiết Kiệm, Viettel Post…"
          disabled={pending}
        />
        <Input
          id="ship-tracking"
          label="Mã vận đơn (tùy chọn)"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          placeholder="GHTK9F2K71"
          disabled={pending}
          hint="Thành viên nhìn thấy mã này ngay ở trang đơn hàng của họ."
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Quay lại
        </Button>
        <Button type="button" onClick={submit} isLoading={pending} disabled={pending}>
          Đánh dấu đã gửi
        </Button>
      </div>
    </ModalShell>
  );
}

/**
 * "Đã giao". Deliberately does not touch payment — a COD order stays
 * awaiting collection until the cash is actually back, which is its own
 * confirmation.
 */
export function DeliverOrderModal({
  orderId,
  orderNumber,
  isCod,
  onClose,
}: {
  orderId: string;
  orderNumber: number;
  isCod: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await markOrderDeliveredAction(orderId, note);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <ModalShell onClose={onClose} labelledBy="deliver-title">
      <h2 id="deliver-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Package className="h-4 w-4 text-primary" />
        Đã giao — {formatOrderCode(orderNumber)}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {isCod
          ? "Đánh dấu hàng đã tới tay khách. Việc thu tiền là bước riêng — bấm “Đã thu đủ tiền” sau khi tiền về."
          : "Đánh dấu hàng đã tới tay khách. Đơn này đã thanh toán từ trước nên không còn gì để thu."}
      </p>

      <div className="mt-4">
        <Textarea
          id="deliver-note"
          label="Ghi chú (tùy chọn)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Người nhận: mẹ khách, đã gọi xác nhận…"
          disabled={pending}
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Quay lại
        </Button>
        <Button type="button" onClick={submit} isLoading={pending} disabled={pending}>
          Đánh dấu đã giao
        </Button>
      </div>
    </ModalShell>
  );
}

/**
 * Record money going back. Pre-filled with whatever is still refundable so
 * the common case — giving all of it back — is one click, while a partial
 * refund is just editing the number down.
 */
export function RefundOrderModal({
  orderId,
  orderNumber,
  refundableAmount,
  existingRefunds,
  onClose,
}: {
  orderId: string;
  orderNumber: number;
  refundableAmount: number;
  /** Live refunds already recorded on this order, newest first. */
  existingRefunds: { id: string; amount: number; reason: RefundReason; note: string | null; refundedAtLabel: string }[];
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(String(refundableAmount));
  const [reason, setReason] = useState<RefundReason>(REFUND_REASONS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Voiding rather than editing: a refund someone has already reconciled
  // against must not quietly change its figure. The row is struck out and a
  // corrected one is entered instead.
  function voidRefund(refundId: string) {
    setError(undefined);
    startTransition(async () => {
      await voidRefundAction(refundId);
      router.refresh();
      onClose();
    });
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await recordRefundAction({
        orderId,
        amount: Number(amount),
        reason,
        note,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <ModalShell onClose={onClose} labelledBy="refund-title">
      <h2 id="refund-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Undo2 className="h-4 w-4 text-danger" />
        Hoàn tiền — {formatOrderCode(orderNumber)}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Còn hoàn được tối đa <span className="font-semibold text-foreground">{formatVND(refundableAmount)}</span>.
        Đơn vẫn giữ trạng thái đã thanh toán — khoản hoàn được ghi thành một dòng riêng.
      </p>

      {existingRefunds.length > 0 && (
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface-hover p-3">
          <p className="text-xs font-semibold text-foreground">Đã hoàn trước đó</p>
          <ul className="space-y-1.5">
            {existingRefunds.map((refund) => (
              <li key={refund.id} className="flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    {formatVND(refund.amount)} · {REFUND_REASON_LABELS[refund.reason]}
                  </span>
                  <span className="block text-muted">{refund.refundedAtLabel}</span>
                  {refund.note && <span className="block text-muted">{refund.note}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => voidRefund(refund.id)}
                  disabled={pending}
                  className="shrink-0 font-medium text-danger transition-colors hover:underline disabled:opacity-50"
                >
                  Hủy khoản này
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <Input
          id="refund-amount"
          label="Số tiền hoàn (đ)"
          type="number"
          inputMode="numeric"
          min={1}
          max={refundableAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={pending}
        />
        <Select
          id="refund-reason"
          label="Lý do"
          value={reason}
          onChange={(e) => setReason(e.target.value as RefundReason)}
          disabled={pending}
        >
          {REFUND_REASONS.map((value) => (
            <option key={value} value={value}>
              {REFUND_REASON_LABELS[value]}
            </option>
          ))}
        </Select>
        <Textarea
          id="refund-note"
          label="Ghi chú (tùy chọn)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={pending}
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          Quay lại
        </Button>
        <Button type="button" variant="danger" onClick={submit} isLoading={pending} disabled={pending}>
          Ghi nhận hoàn tiền
        </Button>
      </div>
    </ModalShell>
  );
}

/**
 * Confirming that money arrived, with the option to attach the balance-change
 * screenshot the admin is looking at while they do it.
 *
 * Replaces a plain yes/no confirm because it now carries a file. The image
 * is optional on purpose: an admin confirming from their phone, with the
 * screenshot on another device, must still be able to record what happened.
 *
 * Upload and confirm are two steps (see /api/admin/upload-payment-proof) —
 * the bytes land in the private bucket first, and the Server Action attaches
 * the path inside the same guarded write that claims the order, deleting the
 * upload again if some other request got there first.
 */
export function ConfirmPaymentModal({
  orderId,
  orderNumber,
  studentName,
  amountLabel,
  isCod,
  itemTitles,
  shippingLine,
  onClose,
}: {
  orderId: string;
  orderNumber: number;
  studentName: string;
  amountLabel: string;
  isCod: boolean;
  itemTitles: string;
  shippingLine: string | null;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function submit() {
    setError(undefined);
    let proofPath: string | undefined;

    if (file) {
      setUploading(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/upload-payment-proof", { method: "POST", body });
        const data: { path?: string; error?: string } = await response.json();
        if (!response.ok || !data.path) {
          setError(data.error ?? "Tải ảnh lên thất bại.");
          return;
        }
        proofPath = data.path;
      } catch {
        setError("Tải ảnh lên thất bại. Vui lòng thử lại.");
        return;
      } finally {
        setUploading(false);
      }
    }

    startTransition(async () => {
      const result = await confirmOrderPaidAction(orderId, proofPath);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const busy = pending || uploading;

  return (
    <ModalShell onClose={onClose} labelledBy="confirm-pay-title">
      <h2 id="confirm-pay-title" className="text-base font-semibold text-foreground">
        {isCod ? "Đã thu đủ tiền" : "Xác nhận đã nhận tiền"} — {formatOrderCode(orderNumber)}
      </h2>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Khách</dt>
          <dd className="text-right text-foreground">{studentName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">{isCod ? "Số tiền phải thu" : "Số tiền phải nhận"}</dt>
          <dd className="text-right font-semibold text-foreground">{amountLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Nội dung</dt>
          <dd className="text-right font-mono font-semibold text-primary">
            {formatOrderCode(orderNumber)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-muted">{studentName} sẽ được xác nhận đã mua: {itemTitles}.</p>
      {shippingLine && (
        <p className="mt-2 rounded-lg border border-border bg-surface-hover p-2 text-xs text-muted">
          Giao đến: {shippingLine}
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="proof-file" className="mb-1.5 block text-sm font-medium text-foreground">
          Ảnh biến động số dư (tùy chọn)
        </label>
        <input
          id="proof-file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          Ảnh lưu riêng tư, chỉ admin xem được — thành viên không truy cập được.
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
          Quay lại
        </Button>
        <Button type="button" onClick={submit} isLoading={busy} disabled={busy}>
          {uploading ? "Đang tải ảnh…" : isCod ? "Đã thu đủ tiền" : "Xác nhận đã thanh toán"}
        </Button>
      </div>
    </ModalShell>
  );
}
