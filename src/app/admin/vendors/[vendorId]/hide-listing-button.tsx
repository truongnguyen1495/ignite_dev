"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hideVendorListingAction, unhideVendorListingAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { ModalShell } from "@/components/ui/modal-shell";

type Kind = "PRODUCT" | "COURSE" | "LIBRARY_ITEM";

export function HideListingButton({ kind, itemId, hidden }: { kind: Kind; itemId: string; hidden: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (hidden) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await unhideVendorListingAction(kind, itemId);
            router.refresh();
          })
        }
      >
        Bỏ ẩn
      </Button>
    );
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Ẩn
      </Button>
      {open && (
        <ModalShell onClose={() => setOpen(false)} labelledBy="hide-listing-title">
          <h2 id="hide-listing-title" className="text-base font-semibold text-foreground">
            Ẩn mục này?
          </h2>
          <p className="mt-1 text-sm text-muted">Vendor sẽ thấy lý do này trên trang &quot;Sản phẩm của tôi&quot; của họ.</p>
          <div className="mt-4">
            <Textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              label="Lý do ẩn"
              placeholder="VD: Hình ảnh sản phẩm không đúng mô tả thực tế."
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
                  const result = await hideVendorListingAction(kind, itemId, reason);
                  if (result) {
                    setError(result);
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Ẩn mục này
            </Button>
          </div>
        </ModalShell>
      )}
    </>
  );
}
