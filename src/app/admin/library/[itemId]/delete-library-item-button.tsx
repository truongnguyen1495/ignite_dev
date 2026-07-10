"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLibraryItemAction } from "../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteLibraryItemButton({
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
      variant="danger"
      disabled={pending}
      isLoading={pending}
      onClick={async () => {
        const ok = await confirm({
          title: `Xóa "${libraryItemTitle}"?`,
          description: "File PDF và toàn bộ quyền truy cập đã cấp cho học viên sẽ bị xóa vĩnh viễn.",
          confirmLabel: "Xóa",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteLibraryItemAction(libraryItemId);
          router.push("/admin/library");
        });
      }}
    >
      {pending ? "Đang xóa..." : "Xóa"}
    </Button>
  );
}
