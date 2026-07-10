"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLibraryItemAction } from "./actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteLibraryItemInlineButton({
  libraryItemId,
  libraryItemTitle,
}: {
  libraryItemId: string;
  libraryItemTitle: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Xóa"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirm({
          title: `Xóa "${libraryItemTitle}"?`,
          confirmLabel: "Xóa",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteLibraryItemAction(libraryItemId);
          router.refresh();
        });
      }}
      className="shrink-0 hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
