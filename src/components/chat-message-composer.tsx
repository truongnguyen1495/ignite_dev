"use client";

import { useRef, useState, useTransition, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, X, Loader2 } from "lucide-react";

export type MessageInput = {
  body?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentSize?: number;
};

type PendingAttachment = { path: string; name: string; mime: string; size: number };

// Attachments are uploaded to /api/chat/upload-attachment first (outside the
// server action's ~1MB body limit), then the returned reference is included
// in the onSend payload — same two-step flow as the lesson content editor's
// image insertion. onSend is a server action (bound with any leading
// arguments the specific thread needs, e.g. sendDirectMessageAction.bind(null,
// threadId)) — passed a fixed { body?, attachment* } shape so this component
// stays identical across support/DM/group chat.
export function ChatMessageComposer({
  onSend,
}: {
  onSend: (input: MessageInput) => Promise<string | undefined>;
}) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(undefined);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload-attachment", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Tải tệp lên thất bại.");
        return;
      }
      setAttachment(data);
    } catch {
      setError("Tải tệp lên thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  function handleSend() {
    if (!body.trim() && !attachment) return;
    setError(undefined);
    startTransition(async () => {
      const result = await onSend({
        body: body.trim() || undefined,
        attachmentPath: attachment?.path,
        attachmentName: attachment?.name,
        attachmentMime: attachment?.mime,
        attachmentSize: attachment?.size,
      });
      if (result) {
        setError(result);
        return;
      }
      setBody("");
      setAttachment(null);
      router.refresh();
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
      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-1.5 text-xs text-muted">
          <span className="truncate">{attachment.name}</span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="shrink-0 text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Đính kèm tệp"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Nhập tin nhắn..."
          className="max-h-32 flex-1 resize-none rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={pending || uploading || (!body.trim() && !attachment)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
