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
  // Starts as null — meaning "not measured yet" — and stays null through
  // the server render AND the first client render. It used to be seeded
  // from Date.now() in a useState initializer, which runs in both places a
  // second or so apart: the server shipped "28:34", the browser hydrated
  // "28:33", and React threw a hydration mismatch that (in dev) puts an
  // error overlay over the whole page, swallowing clicks on the buttons
  // underneath. A clock cannot agree with a render that happened in the
  // past, so the fix is to not render one until the browser owns it.
  const [remaining, setRemaining] = useState<number | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    const tick = () => setRemaining(deadlineMs - Date.now());
    // rAF rather than calling tick() straight away: the first real value
    // lands before the browser paints, so the placeholder below is never
    // actually seen, while the update still happens outside the effect body
    // (a synchronous setState there is its own cascading-render problem).
    const frame = requestAnimationFrame(tick);
    const interval = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [deadlineMs]);

  useEffect(() => {
    if (remaining === null || remaining > 0 || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [remaining, router]);

  const urgent = remaining !== null && remaining > 0 && remaining <= URGENT_SECONDS * 1000;

  return (
    <p
      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
        urgent
          ? "border-danger-border bg-danger-bg text-danger"
          : "border-warning-border bg-warning-bg text-warning"
      }`}
    >
      <Timer className="h-4 w-4 shrink-0" />
      {remaining !== null && remaining <= 0 ? (
        "Đã hết hạn thanh toán — đang cập nhật trạng thái…"
      ) : (
        <span>
          Còn{" "}
          <span className="font-mono text-base tabular-nums">
            {/* The em dashes exist for one frame at most — see the rAF in
                the effect above — but they keep the server and client
                markup identical, which is the whole point. */}
            {remaining === null ? "--:--" : formatRemaining(remaining)}
          </span>{" "}
          để chuyển khoản
        </span>
      )}
    </p>
  );
}
