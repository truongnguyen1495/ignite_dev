"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeVN } from "@/lib/date";

type Attempt = {
  id: string;
  scorePercent: number;
  passed: boolean;
  attemptedAt: Date;
};

export function AttemptGroup({
  lessonTitle,
  latest,
  history,
}: {
  lessonTitle: string;
  latest: Attempt;
  history: Attempt[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-lg border border-border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-foreground">{lessonTitle}</span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-foreground">{latest.scorePercent}%</span>
          {latest.passed ? <Badge color="success">Đạt</Badge> : <Badge color="danger">Chưa đạt</Badge>}
          <span className="text-muted">{formatDateTimeVN(latest.attemptedAt)}</span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-surface-hover"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {history.length + 1} lần
            </button>
          )}
        </span>
      </div>
      {expanded && (
        <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
          {history.map((attempt) => (
            <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 pl-4 text-xs">
              <span className="text-muted">↳ lượt trước</span>
              <span className="flex items-center gap-3">
                <span className="text-foreground">{attempt.scorePercent}%</span>
                {attempt.passed ? <Badge color="success">Đạt</Badge> : <Badge color="danger">Chưa đạt</Badge>}
                <span className="text-muted">{formatDateTimeVN(attempt.attemptedAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
