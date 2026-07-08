"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Circle } from "lucide-react";
import type { QuizCompletionDetail } from "@/lib/level-completion";

const STATUS_STYLES = {
  passed: { icon: CheckCircle2, className: "text-success" },
  failed: { icon: XCircle, className: "text-danger" },
  not_attempted: { icon: Circle, className: "text-faint" },
} as const;

export function CompletionDetails({ details }: { details: QuizCompletionDetail[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {open ? "Ẩn chi tiết" : "Xem chi tiết từng bài"}
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5 rounded-lg border border-border bg-background p-3">
          {details.map((detail) => {
            const { icon: Icon, className } = STATUS_STYLES[detail.status];
            return (
              <li key={detail.quizId} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${className}`} />
                  {detail.lessonTitle}
                </span>
                <span className={detail.status === "not_attempted" ? "text-muted" : className}>
                  {detail.scorePercent !== null ? `${detail.scorePercent}%` : "Chưa làm"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
