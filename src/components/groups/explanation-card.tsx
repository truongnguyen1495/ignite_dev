"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Shared by the group's own LEADER/DEPUTY (/dashboard/my-group/explanations)
// and an admin managing any group (/admin/groups/[groupId], tab "Giải trình
// chờ duyệt") — same reasoning as CreateTaskForm: only which Server Action
// `action` calls differs, not the UI.
export function ExplanationCard({
  completionId,
  memberName,
  taskTitle,
  dateLabel,
  explanationText,
  action,
}: {
  completionId: string;
  memberName: string;
  taskTitle: string;
  dateLabel: string;
  explanationText: string;
  action: (completionId: string, approve: boolean) => Promise<string | undefined>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [removing, setRemoving] = useState(false);

  function review(approve: boolean) {
    setError(undefined);
    startTransition(async () => {
      const err = await action(completionId, approve);
      if (err) {
        setError(err);
        return;
      }
      setRemoving(true);
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border border-warning-border bg-warning-bg p-4 transition-all ${
        removing ? "translate-x-2 opacity-0" : "opacity-100"
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-foreground">{memberName}</span>
        <span className="text-xs text-muted">
          — {taskTitle} · {dateLabel}
        </span>
      </div>
      <p className="rounded-lg bg-surface/70 px-3 py-2 text-sm text-foreground">{explanationText}</p>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => review(true)}
          className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Duyệt
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => review(false)}
          className="rounded-lg border border-danger-border bg-danger-bg px-3 py-1.5 text-xs font-semibold text-danger hover:opacity-90 disabled:opacity-50"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}
