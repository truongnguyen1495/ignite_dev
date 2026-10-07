"use client";

import { Button } from "@/components/ui/button";

// The list could not be loaded (database or network failure). Nothing has been
// changed by this; trying again is safe.
export default function TeamNetworkError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-danger-border bg-danger-bg px-6 py-8 text-center">
      <p className="text-base font-semibold text-foreground">Không tải được Team Network</p>
      <p className="mt-1 text-sm text-muted">Kết nối tới máy chủ bị gián đoạn. Dữ liệu của bạn không bị ảnh hưởng.</p>
      <Button type="button" className="mt-4" onClick={reset}>
        Thử lại
      </Button>
    </div>
  );
}
