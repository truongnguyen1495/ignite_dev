"use client";

import { useState } from "react";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { useChatBroadcast } from "@/lib/use-chat-broadcast";
import { ChatMessageList, type ChatMessageRow } from "@/components/chat-message-list";
import { ChatMessageComposer, type MessageInput } from "@/components/chat-message-composer";
import { openSupportChatAction, fetchSupportMessagesAction, sendSupportMessageAction } from "./chat/actions";

// Floating support-chat bubble for "học sinh" (no-cấp accounts) — same
// authenticated SUPPORT ChatThread học viên use via /dashboard/chat/support,
// just surfaced as a widget since học sinh get the guest-style layout with
// no sidebar/chat nav item. Deliberately mirrors GuestChatWidget's UI/layout
// so the experience matches what the student already saw as a guest.
export function SupportChatWidget({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);

  async function handleOpen() {
    setOpen(true);
    if (hasOpenedOnce) return;
    setHasOpenedOnce(true);
    setLoading(true);
    const result = await openSupportChatAction();
    setThreadId(result.threadId);
    setMessages(result.messages);
    setLoading(false);
  }

  useChatBroadcast(threadId, async () => {
    setMessages(await fetchSupportMessagesAction());
  });

  async function handleSend(input: MessageInput) {
    const error = await sendSupportMessageAction(input);
    if (error) return error;
    setMessages(await fetchSupportMessagesAction());
    return undefined;
  }

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-medium">Hỗ trợ từ admin</span>
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
            <ChatMessageList messages={messages} currentUserId={studentId} />
          )}
          <ChatMessageComposer onSend={handleSend} />
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
