import { ChatAttachment } from "./chat-attachment";
import { formatTimeVN } from "@/lib/date";

export type ChatMessageRow = {
  id: string;
  body: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  createdAt: Date;
  sender: { id: string; name: string };
};

export function ChatMessageList({
  messages,
  currentUserId,
}: {
  messages: ChatMessageRow[];
  currentUserId: string;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted">Chưa có tin nhắn nào. Gửi lời chào đầu tiên nhé!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((message) => {
        const mine = message.sender.id === currentUserId;
        return (
          <div key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
            {!mine && <span className="mb-0.5 px-1 text-xs text-muted">{message.sender.name}</span>}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                mine ? "bg-primary text-primary-foreground" : "bg-surface-hover text-foreground"
              }`}
            >
              {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
              {message.attachmentPath && (
                <ChatAttachment
                  messageId={message.id}
                  name={message.attachmentName ?? "Tệp đính kèm"}
                  mime={message.attachmentMime}
                  mine={mine}
                />
              )}
            </div>
            <span className="mt-0.5 px-1 text-[11px] text-faint">
              {formatTimeVN(message.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
