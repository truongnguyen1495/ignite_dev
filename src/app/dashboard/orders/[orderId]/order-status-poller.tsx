"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Renders nothing — just re-fetches the order every 5s while it's still
// PENDING, so a webhook-confirmed payment (or an admin's manual confirm)
// shows up on its own, matching the "trang này sẽ tự cập nhật trạng thái"
// copy on this page. Stops as soon as the order leaves PENDING (the
// interval is torn down and never rescheduled once `status` changes).
export function OrderStatusPoller({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [status, router]);

  return null;
}
