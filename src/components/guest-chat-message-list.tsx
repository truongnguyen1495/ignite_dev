import type { GuestChatSender } from "@prisma/client";

export type GuestChatMessageRow = {
  id: string;
  sender: GuestChatSender;
  body: string;
  createdAt: Date | string;
};

// Shared by the guest-facing floating widget and the admin's
// /admin/chat/guest/[threadId] reply view — "mine" is decided by comparing
// against `viewerSender` (GUEST or ADMIN) rather than a User id, since a
// guest message has no User to compare against.
export function GuestChatMessageList({
  messages,
  viewerSender,
}: {
  messages: GuestChatMessageRow[];
  viewerSender: GuestChatSender;
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
        const mine = message.sender === viewerSender;
        const createdAt = typeof message.createdAt === "string" ? new Date(message.createdAt) : message.createdAt;
        return (
          <div key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
            {!mine && (
              <span className="mb-0.5 px-1 text-xs text-muted">
                {message.sender === "ADMIN" ? "Admin hỗ trợ" : "Khách"}
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                mine ? "bg-primary text-primary-foreground" : "bg-surface-hover text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
            </div>
            <span className="mt-0.5 px-1 text-[11px] text-faint">
              {createdAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
