"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestLevelUpAction } from "./actions";

export function RequestLevelUpButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await requestLevelUpAction();
          router.refresh();
        });
      }}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
    >
      {pending ? "Đang gửi..." : label}
    </button>
  );
}
