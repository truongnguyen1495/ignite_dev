"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestLevelUpAction } from "./actions";
import { Button } from "@/components/ui/button";

export function RequestLevelUpButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      isLoading={pending}
      onClick={() => {
        startTransition(async () => {
          await requestLevelUpAction();
          router.refresh();
        });
      }}
    >
      {pending ? "Đang gửi..." : label}
    </Button>
  );
}
