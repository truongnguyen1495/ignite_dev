"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { markCourseLessonCompleteAction } from "../../../actions";

export function MarkCompleteButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await markCourseLessonCompleteAction(lessonId);
      router.refresh();
    });
  }

  if (completed) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-success-bg px-4 py-2 text-sm font-medium text-success">
        <CheckCircle2 className="h-4 w-4" />
        Đã hoàn thành
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
      {pending ? "Đang lưu..." : "Đánh dấu hoàn thành"}
    </button>
  );
}
