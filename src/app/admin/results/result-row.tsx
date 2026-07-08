"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Attempt = {
  id: string;
  scorePercent: number;
  passed: boolean;
  attemptedAt: Date;
};

export function ResultRow({
  studentName,
  lessonTitle,
  latest,
  history,
}: {
  studentName: string;
  lessonTitle: string;
  latest: Attempt;
  history: Attempt[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-surface-hover">
        <td className="px-4 py-4 sm:px-6 font-medium text-foreground">{studentName}</td>
        <td className="px-4 py-4 sm:px-6 text-muted">{lessonTitle}</td>
        <td className="px-4 py-4 sm:px-6 text-foreground">{latest.scorePercent}%</td>
        <td className="px-4 py-4 sm:px-6">
          {latest.passed ? <Badge color="success">Đạt</Badge> : <Badge color="danger">Chưa đạt</Badge>}
        </td>
        <td className="px-4 py-4 sm:px-6 text-muted">
          <div className="flex items-center gap-2">
            {latest.attemptedAt.toLocaleString("vi-VN")}
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
          </div>
        </td>
      </tr>
      {expanded &&
        history.map((attempt) => (
          <tr key={attempt.id} className="border-b border-border bg-background last:border-0">
            <td className="px-4 py-3 sm:px-6" />
            <td className="px-4 py-3 sm:px-6 text-xs text-muted">↳ lượt trước</td>
            <td className="px-4 py-3 sm:px-6 text-foreground">{attempt.scorePercent}%</td>
            <td className="px-4 py-3 sm:px-6">
              {attempt.passed ? <Badge color="success">Đạt</Badge> : <Badge color="danger">Chưa đạt</Badge>}
            </td>
            <td className="px-4 py-3 sm:px-6 text-muted">{attempt.attemptedAt.toLocaleString("vi-VN")}</td>
          </tr>
        ))}
    </>
  );
}
