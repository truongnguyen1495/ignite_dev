"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendVendorAction, unsuspendVendorAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { ModalShell } from "@/components/ui/modal-shell";

export function SuspendVendorControl({ vendorId, suspended }: { vendorId: string; suspended: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (suspended) {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        isLoading={pending}
        onClick={() =>
          startTransition(async () => {
            await unsuspendVendorAction(vendorId);
            router.refresh();
          })
        }
      >
        Mở khoá gian hàng
      </Button>
    );
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Khoá gian hàng
      </Button>
      {open && (
        <ModalShell onClose={() => setOpen(false)} labelledBy="suspend-vendor-title">
          <h2 id="suspend-vendor-title" className="text-base font-semibold text-foreground">
            Khoá gian hàng này?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ẩn toàn bộ sản phẩm khỏi khách &amp; học viên, tạm dừng nhận đơn mới. Đơn đang xử lý vẫn tiếp tục.
          </p>
          <div className="mt-4">
            <Textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              label="Lý do khoá"
            />
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              isLoading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await suspendVendorAction(vendorId, reason);
                  if (result) {
                    setError(result);
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Khoá gian hàng
            </Button>
          </div>
        </ModalShell>
      )}
    </>
  );
}
