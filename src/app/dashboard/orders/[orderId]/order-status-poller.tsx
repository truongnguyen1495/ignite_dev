"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// How often to ask. Faster than the 5s this used to run at, and still far
// cheaper: it used to call router.refresh(), which re-renders the entire
// route — dashboard layout included — for ~4.7s of database work per tick
// against a connection_limit=1 pool. Now it fetches one JSON field (~0.44s)
// and only refreshes the page on the one tick where the answer changed.
const POLL_MS = 3000;

// Renders nothing. Watches an order that is still waiting for money and
// refreshes the page once — and only once — when it stops waiting, whether
// that's the SePay webhook confirming it, an admin confirming by hand, or
// its own payment deadline running out.
export function OrderStatusPoller({ status, orderId }: { status: string; orderId: string }) {
  const router = useRouter();
  // Guards against a slow refresh letting a second poll fire and stack up
  // another one on top of it.
  const settled = useRef(false);

  useEffect(() => {
    if (status !== "PENDING") return;
    settled.current = false;

    // AbortController so an in-flight request doesn't resolve after the
    // buyer has navigated away and call router.refresh() on a dead page.
    const controller = new AbortController();
    const interval = setInterval(async () => {
      if (settled.current) return;
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const data: { status?: string } = await response.json();
        if (data.status && data.status !== "PENDING") {
          settled.current = true;
          router.refresh();
        }
      } catch {
        // A dropped poll is not worth showing anyone: the next tick tries
        // again, and the page still refreshes on its own navigation.
      }
    }, POLL_MS);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [status, orderId, router]);

  return null;
}
