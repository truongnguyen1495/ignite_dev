"use client";

import { useActionState } from "react";
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
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
      >
        {pending ? "..." : "Từ chối"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
