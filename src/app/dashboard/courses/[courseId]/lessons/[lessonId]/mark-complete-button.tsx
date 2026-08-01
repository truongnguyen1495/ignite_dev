"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Lock } from "lucide-react";
import { markCourseLessonCompleteAction } from "../../../actions";
import { useCelebrate } from "@/components/ui/toast";
import { useLessonWatchProgress } from "@/components/lesson-watch-progress-provider";

export function MarkCompleteButton({
  lessonId,
  completed,
  enforced = false,
  thresholdPercent = 80,
}: {
  lessonId: string;
  completed: boolean;
  // Whether the watch-percent gate applies to this student for this
  // lesson at all (video + known duration + the role's enforcement toggle
  // all true) — see the Settings fields in schema.prisma. False means this
  // button behaves exactly like it did before this feature existed.
  enforced?: boolean;
  thresholdPercent?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();
  const celebrate = useCelebrate();
  const { watchedSeconds, percent } = useLessonWatchProgress();

  function handleClick() {
    setError(undefined);
    startTransition(async () => {
      const result = await markCourseLessonCompleteAction(lessonId, watchedSeconds);
      if (result) {
        setError(result);
        return;
      }
      celebrate({ title: "Đã hoàn thành bài học!", description: "Tiếp tục phát huy nhé." });
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

  const locked = enforced && percent < thresholdPercent;

  if (locked) {
    return (
      <div>
        <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted">
          <Lock className="h-4 w-4" />
          Đánh dấu hoàn thành
        </span>
        <p className="mt-1.5 text-xs text-muted">
          Xem đủ {thresholdPercent}% video để mở khoá (đã xem {percent}%).
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
        {pending ? "Đang lưu..." : "Đánh dấu hoàn thành"}
      </button>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
