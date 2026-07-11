"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

// Text-only, unlike ChatMessageComposer — no attachment support for guest
// chat in this first cut. Shared by the guest widget and the admin reply
// view; onSend already knows which thread/sender it's posting as.
export function GuestChatComposer({
  onSend,
  disabled = false,
}: {
  onSend: (body: string) => Promise<{ error?: string } | void>;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(undefined);
    startTransition(async () => {
      const result = await onSend(trimmed);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setBody("");
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-border p-3">
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder="Nhập tin nhắn..."
          className="max-h-32 flex-1 resize-none rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || pending || !body.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
