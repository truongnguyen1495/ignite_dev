"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVendorCommissionOverrideAction } from "../actions";
import { Button } from "@/components/ui/button";

export function CommissionRateForm({ vendorId, currentOverride }: { vendorId: string; currentOverride: number | null }) {
  const [value, setValue] = useState(currentOverride === null ? "" : String(currentOverride));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
        disabled={pending}
        isLoading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setVendorCommissionOverrideAction(vendorId, value);
            if (result) {
              setError(result);
              return;
            }
            setError(null);
            router.refresh();
          })
        }
      >
        Lưu thay đổi
      </Button>
    </div>
  );
}
