"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { requestVendorPayoutAction } from "./actions";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/currency";

export function RequestPayoutButton({ amount }: { amount: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (amount <= 0) {
    return null;
  }

  return (
    <div>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await requestVendorPayoutAction();
            if (result.error) {
              setError(result.error);
              return;
            }
            setError(null);
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Yêu cầu rút {formatVND(amount)}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
