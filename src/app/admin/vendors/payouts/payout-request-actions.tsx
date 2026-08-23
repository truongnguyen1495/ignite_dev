"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePayoutRequestAction, rejectPayoutRequestAction } from "../actions";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { Textarea } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function PayoutRequestActions({ payoutRequestId, amountLabel }: { payoutRequestId: string; amountLabel: string }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={() => setShowReject(true)} disabled={pending}>
        Từ chối
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        isLoading={pending}
        onClick={async () => {
          const ok = await confirm({
            title: `Duyệt chi ${amountLabel}?`,
            description: "Xác nhận bạn ĐÃ chuyển khoản số tiền này cho vendor — hành động này tạo ngay một khoản chi trong Thu chi.",
            confirmLabel: "Đã chuyển khoản, duyệt",
            tone: "primary",
          });
          if (!ok) return;
          startTransition(async () => {
            const result = await approvePayoutRequestAction(payoutRequestId);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        Duyệt
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
      {showReject && (
        <ModalShell onClose={() => setShowReject(false)} labelledBy="reject-payout-title">
          <h2 id="reject-payout-title" className="text-base font-semibold text-foreground">
            Từ chối yêu cầu rút tiền?
          </h2>
          <p className="mt-1 text-sm text-muted">Số dư sẽ được trả lại vào tài khoản khả dụng của vendor.</p>
          <div className="mt-4">
            <Textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} label="Lý do từ chối" />
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowReject(false)} disabled={pending}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              isLoading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await rejectPayoutRequestAction(payoutRequestId, reason);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setShowReject(false);
                  router.refresh();
                })
              }
            >
              Từ chối
            </Button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
