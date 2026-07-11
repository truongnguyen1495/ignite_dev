"use client";

import { useActionState } from "react";
import { XCircle } from "lucide-react";
import { rejectJoinRequestAction } from "./actions";
import { Button } from "@/components/ui/button";

export function RejectForm({ requestId }: { requestId: string }) {
  const [error, formAction, pending] = useActionState(rejectJoinRequestAction, undefined);

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
      <Button type="submit" variant="danger" size="sm" disabled={pending} isLoading={pending}>
        <XCircle className="h-4 w-4" />
        {pending ? "..." : "Từ chối"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
