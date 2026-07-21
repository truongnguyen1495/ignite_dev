"use client";

import { useState } from "react";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { useChatBroadcast } from "@/lib/use-chat-broadcast";
import { GuestChatMessageList } from "@/components/guest-chat-message-list";
import { GuestChatComposer } from "@/components/guest-chat-composer";
import { openGuestChatAction, sendGuestMessageAction, fetchGuestMessagesAction, type GuestChatMessageRow } from "./actions";

export function GuestChatWidget() {
  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GuestChatMessageRow[]>([]);

  async function handleOpen() {
    setOpen(true);
    if (hasOpenedOnce) return;
    setHasOpenedOnce(true);
    setLoading(true);
    const result = await openGuestChatAction();
    setThreadId(result.threadId);
    setMessages(result.messages);
    setLoading(false);
  }

  useChatBroadcast(threadId, async () => {
    if (!threadId) return;
    setMessages(await fetchGuestMessagesAction(threadId));
  });

  async function handleSend(body: string) {
    const result = await sendGuestMessageAction(body);
    if (result.error) return { error: result.error };
    if (threadId) {
      setMessages(await fetchGuestMessagesAction(threadId));
    }
    return {};
  }

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-medium">Hỗ trợ trực tuyến</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : (
            <GuestChatMessageList messages={messages} viewerSender="GUEST" />
          )}
          <GuestChatComposer onSend={handleSend} disabled={loading} />
        </div>
      )}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        title="Chat hỗ trợ"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
