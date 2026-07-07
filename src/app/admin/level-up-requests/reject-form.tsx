"use client";

import { useActionState } from "react";
import { XCircle } from "lucide-react";
import { rejectLevelUpRequestAction } from "./actions";

export function RejectForm({ requestId }: { requestId: string }) {
  const [error, formAction, pending] = useActionState(rejectLevelUpRequestAction, undefined);

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <input
        type="text"
        name="reviewerNote"
        required
        placeholder="Lý do từ chối"
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
      >
        <XCircle className="h-4 w-4" />
        {pending ? "..." : "Từ chối"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
