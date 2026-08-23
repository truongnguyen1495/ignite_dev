"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  toggleVendorProductVisibilityAction,
  toggleVendorCourseVisibilityAction,
  toggleVendorLibraryItemVisibilityAction,
} from "./actions";
import { Button } from "@/components/ui/button";

const ACTION_BY_KIND = {
  PRODUCT: toggleVendorProductVisibilityAction,
  COURSE: toggleVendorCourseVisibilityAction,
  LIBRARY_ITEM: toggleVendorLibraryItemVisibilityAction,
} as const;

export function ToggleVendorListingButton({
  kind,
  id,
  hidden,
}: {
  kind: "PRODUCT" | "COURSE" | "LIBRARY_ITEM";
  id: string;
  hidden: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const action = ACTION_BY_KIND[kind];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={hidden ? "Đang ẩn — bấm để hiển thị lại" : "Đang bán — bấm để ẩn"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await action(id);
          router.refresh();
        })
      }
      className={hidden ? "text-warning hover:bg-warning-bg" : "hover:bg-surface-hover"}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}
