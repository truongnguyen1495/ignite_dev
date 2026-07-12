"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreRevokedPermissionsAction } from "./actions";

export function RestorePermissionsButton({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await restoreRevokedPermissionsAction(adminId);
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={onClick}
      title={`Khôi phục quyền admin đã thu hồi của "${adminName}"`}
      className="shrink-0 hover:bg-primary/10 hover:text-primary"
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  );
}
