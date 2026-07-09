"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAnnouncementAction } from "../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteAnnouncementButton({
  announcementId,
  announcementTitle,
}: {
  announcementId: string;
  announcementTitle: string;
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
          title: `Xóa bản tin "${announcementTitle}"?`,
          description: "Bản tin sẽ bị xóa vĩnh viễn và không thể khôi phục.",
          confirmLabel: "Xóa bản tin",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteAnnouncementAction(announcementId);
          router.push("/admin/announcements");
        });
      }}
    >
      {pending ? "Đang xóa..." : "Xóa bản tin"}
    </Button>
  );
}
