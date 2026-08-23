"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVendorCommissionOverrideAction } from "../actions";
import { Button } from "@/components/ui/button";

export function CommissionRateForm({ vendorId, currentOverride }: { vendorId: string; currentOverride: number | null }) {
  const initial = currentOverride === null ? "" : String(currentOverride);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // The rate last written to the server, compared against the live field to
  // work out whether anything is owed. Before this the button read "Lưu thay
  // đổi" both before and after a save, so a successful save looked exactly
  // like a click that did nothing.
  const [saved, setSaved] = useState(initial);
  const isDirty = value.trim() !== saved.trim();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-background p-4">
      <span className="text-sm text-muted">RapidX giữ lại</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Mặc định chung"
        className="w-24 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-right font-mono text-sm font-semibold text-primary focus:border-primary focus:outline-none"
      />
      <span className="text-sm text-muted">% trên mỗi đơn hàng của gian hàng này</span>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
      <Button
        type="button"
        size="sm"
        className="ml-auto"
        variant={isDirty ? "primary" : "secondary"}
        disabled={pending || !isDirty}
        isLoading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setVendorCommissionOverrideAction(vendorId, value);
            if (result) {
              setError(result);
              return;
            }
            setError(null);
            setSaved(value);
            router.refresh();
          })
        }
      >
        {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
      </Button>
    </div>
  );
}
