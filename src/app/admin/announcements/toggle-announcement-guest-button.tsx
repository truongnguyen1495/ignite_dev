"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, GlobeOff, Loader2 } from "lucide-react";
import { setAnnouncementGuestVisibilityAction } from "./actions";
import { Button } from "@/components/ui/button";

export function ToggleAnnouncementGuestButton({
  announcementId,
  visibleToGuest,
}: {
  announcementId: string;
  visibleToGuest: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={visibleToGuest ? "Đang công khai cho khách — bấm để ẩn" : "Bấm để công khai cho khách"}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          await setAnnouncementGuestVisibilityAction(announcementId, !visibleToGuest);
          router.refresh();
        });
      }}
      className={`shrink-0 ${visibleToGuest ? "text-info hover:bg-info-bg" : "hover:bg-surface-hover"}`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : visibleToGuest ? (
        <Globe className="h-4 w-4" />
      ) : (
        <GlobeOff className="h-4 w-4" />
      )}
    </Button>
  );
}
