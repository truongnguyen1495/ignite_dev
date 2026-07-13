"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setSalesEnabledAction } from "./actions";

export function SalesToggle({ salesEnabled }: { salesEnabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">Bán khóa học / thư viện</p>
        <p className="text-sm text-muted">
          Bật/tắt toàn bộ tính năng bán hàng — nút &quot;Mua ngay&quot;, trang &quot;Đơn hàng của tôi&quot;
          của học viên, và trang &quot;Đơn hàng&quot; của admin đều ẩn đi khi tắt. Chỉ bật sau khi đã điền
          đầy đủ thông tin chuyển khoản bên dưới. Nếu đang có đơn chờ xác nhận, phải bật lại công tắc này
          mới xử lý được.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={salesEnabled}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await setSalesEnabledAction(!salesEnabled);
            router.refresh();
          });
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          salesEnabled ? "bg-primary" : "bg-border"
        }`}
      >
        {pending ? (
          <Loader2 className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 animate-spin text-primary-foreground" />
        ) : (
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              salesEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}
