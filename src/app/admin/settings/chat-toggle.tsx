"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setChatEnabledAction } from "./actions";

export function ChatToggle({ chatEnabled }: { chatEnabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">Tính năng chat</p>
        <p className="text-sm text-muted">
          Bật/tắt nhắn tin hỗ trợ, nhắn tin trực tiếp, chat nhóm cho học viên và admin, và chat hỗ trợ cho khách chưa đăng nhập.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={chatEnabled}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await setChatEnabledAction(!chatEnabled);
            router.refresh();
          });
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          chatEnabled ? "bg-primary" : "bg-border"
        }`}
      >
        {pending ? (
          <Loader2 className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 animate-spin text-primary-foreground" />
        ) : (
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              chatEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}
