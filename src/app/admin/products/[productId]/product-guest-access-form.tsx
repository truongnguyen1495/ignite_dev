"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setProductGuestAccessAction } from "../actions";
import { Button } from "@/components/ui/button";

// Mirrors CourseGuestAccessForm (src/app/admin/courses/[courseId]/
// course-guest-access-form.tsx) minus the trial-lesson picker — a Product
// has no sub-content to preview, so the guest toggle is the whole form.
export function ProductGuestAccessForm({
  productId,
  hiddenFromGuest,
}: {
  productId: string;
  hiddenFromGuest: boolean;
}) {
  const [error, formAction, pending] = useActionState(setProductGuestAccessAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="visibleToGuest"
          defaultChecked={!hiddenFromGuest}
          className="h-4 w-4 accent-primary"
        />
        Hiển thị cho khách xem
      </label>
      <p className="text-xs text-muted">
        Tắt đi thì sản phẩm bị ẩn hoàn toàn khỏi trang khách — chỉ những học viên đủ điều kiện ở
        phần cấp quyền theo cấp/cấp riêng bên dưới mới xem được.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        type="submit"
        size="sm"
        variant={isDirty ? "primary" : "secondary"}
        disabled={pending || !isDirty}
        isLoading={pending}
      >
        {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
      </Button>
    </form>
  );
}
