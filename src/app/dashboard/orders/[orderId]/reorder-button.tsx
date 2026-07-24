"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorderAction, type ReorderResult } from "../actions";

// Result dialog only appears when something needed explaining (a skipped
// item) — a fully clean reorder just navigates straight to the cart with no
// extra click, matching this app's general "don't confirm what doesn't need
// confirming" pattern (see the cart's own "Thêm vào giỏ hàng" not popping a
// dialog either).
function ReorderResultDialog({ result, onClose }: { result: ReorderResult; onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 text-left shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Kết quả đặt lại</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {result.addedCount > 0 && (
          <p className="text-sm text-foreground">
            Đã thêm {result.addedCount} sản phẩm vào giỏ hàng (theo giá hiện tại).
          </p>
        )}
        {result.skipped.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-border bg-faint-bg p-3 text-sm">
            <p className="text-xs font-medium text-muted">
              {result.addedCount > 0 ? "Không thể đặt lại:" : "Không có sản phẩm nào đặt lại được:"}
            </p>
            <ul className="space-y-1">
              {result.skipped.map((s, i) => (
                <li key={i} className="text-foreground">
                  <span className="font-medium">{s.title}</span> — <span className="text-muted">{s.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          {result.addedCount > 0 && (
            <Button type="button" variant="primary" onClick={() => router.push("/dashboard/cart")}>
              Đến giỏ hàng
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReorderButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReorderResult | null>(null);
  const router = useRouter();

  function onReorder() {
    startTransition(async () => {
      const res = await reorderAction(orderId);
      if (res.skipped.length === 0) {
        // Nothing needed explaining — go straight to the cart, same as a
        // plain "Thêm vào giỏ hàng".
        router.push("/dashboard/cart");
        return;
      }
      setResult(res);
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" isLoading={pending} onClick={onReorder}>
        Đặt lại
      </Button>
      {result && <ReorderResultDialog result={result} onClose={() => setResult(null)} />}
    </>
  );
}
