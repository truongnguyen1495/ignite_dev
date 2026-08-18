"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";

// Below this many seconds the countdown turns red — enough time to still
// finish a transfer, late enough that it doesn't nag for the whole window.
const URGENT_SECONDS = 5 * 60;

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/**
 * Purely a display. The cancel itself happens server-side in
 * expirePendingOrderIfNeeded, called on every load of this page and on every
 * poll tick — so this clock reaching zero is never what decides anything.
 * When it does hit zero it asks for one refresh, because the poller would
 * take up to another 3s to notice and there's no reason to make someone
 * watch a dead clock that long.
 */
export function OrderExpiryCountdown({ deadline }: { deadline: Date }) {
  const router = useRouter();
  const deadlineMs = deadline.getTime();
  // Computed in an initializer rather than as a constant, so the first
  // paint after hydration already shows the right number.
  const [remaining, setRemaining] = useState(() => deadlineMs - Date.now());
  const refreshed = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setRemaining(deadlineMs - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  useEffect(() => {
    if (remaining > 0 || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [remaining, router]);

  const urgent = remaining > 0 && remaining <= URGENT_SECONDS * 1000;

  return (
    <p
      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
        urgent
          ? "border-danger-border bg-danger-bg text-danger"
          : "border-warning-border bg-warning-bg text-warning"
      }`}
    >
      <Timer className="h-4 w-4 shrink-0" />
      {remaining <= 0 ? (
        "Đã hết hạn thanh toán — đang cập nhật trạng thái…"
      ) : (
        <span>
          Còn <span className="font-mono text-base tabular-nums">{formatRemaining(remaining)}</span>{" "}
          để chuyển khoản
        </span>
      )}
    </p>
  );
}
