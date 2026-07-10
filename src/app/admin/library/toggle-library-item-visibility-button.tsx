"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { setLibraryItemVisibleToStudentsAction } from "./actions";
import { Button } from "@/components/ui/button";

export function ToggleLibraryItemVisibilityButton({
  libraryItemId,
  visibleToStudents,
}: {
  libraryItemId: string;
  visibleToStudents: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={
        visibleToStudents ? "Đang hiển thị cho học viên — bấm để ẩn" : "Đang ẩn khỏi học viên — bấm để hiển thị"
      }
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
          await setLibraryItemVisibleToStudentsAction(libraryItemId, !visibleToStudents);
          router.refresh();
        });
      }}
      className={`shrink-0 ${visibleToStudents ? "hover:bg-surface-hover" : "text-warning hover:bg-warning-bg"}`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : visibleToStudents ? (
        <Eye className="h-4 w-4" />
      ) : (
        <EyeOff className="h-4 w-4" />
      )}
    </Button>
  );
}
