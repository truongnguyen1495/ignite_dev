"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveVendorApplicationAction, rejectVendorApplicationAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function PendingVendorActions({ vendorId }: { vendorId: string }) {
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  if (showReject) {
    return (
      <div className="space-y-2">
        <Textarea
          autoFocus
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          label="Lý do từ chối (gửi cho vendor)"
          placeholder="VD: Thông tin ngân hàng chưa hợp lệ, vui lòng nộp lại."
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowReject(false)} disabled={pending}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={pending}
            isLoading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await rejectVendorApplicationAction(vendorId, note);
                if (result) {
                  setError(result);
                  return;
                }
                router.refresh();
              })
            }
          >
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="ghost" className="flex-1 justify-center" onClick={() => setShowReject(true)}>
        Từ chối
      </Button>
      <Button
        type="button"
        className="flex-1 justify-center"
        disabled={pending}
        isLoading={pending}
        onClick={async () => {
          const ok = await confirm({
            title: "Duyệt hồ sơ này?",
            description: "Vendor sẽ có thể đăng sản phẩm bán ngay lập tức, không cần duyệt riêng từng mục.",
            confirmLabel: "Duyệt hồ sơ",
            tone: "primary",
          });
          if (!ok) return;
          startTransition(async () => {
            await approveVendorApplicationAction(vendorId);
            router.refresh();
          });
        }}
      >
        Duyệt hồ sơ
      </Button>
    </div>
  );
}
