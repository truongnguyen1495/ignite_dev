"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setRegistrationEnabledAction } from "./actions";

export function RegistrationToggle({ registrationEnabled }: { registrationEnabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">Đăng ký tài khoản mới</p>
        <p className="text-sm text-muted">
          Bật/tắt cho phép người dùng mới tự đăng ký tài khoản tại trang đăng ký. Khi tắt, tài khoản mới chỉ
          có thể được Admin tạo thủ công.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={registrationEnabled}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await setRegistrationEnabledAction(!registrationEnabled);
            router.refresh();
          });
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          registrationEnabled ? "bg-primary" : "bg-border"
        }`}
      >
        {pending ? (
          <Loader2 className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 animate-spin text-primary-foreground" />
        ) : (
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              registrationEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}
