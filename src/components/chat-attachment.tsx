import { Paperclip } from "lucide-react";

export function ChatAttachment({
  messageId,
  name,
  mime,
  mine,
}: {
  messageId: string;
  name: string;
  mime: string | null;
  mine: boolean;
}) {
  const href = `/api/chat/attachments/${messageId}`;

  if (mime?.startsWith("image/")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={name} className="max-h-64 rounded-lg object-cover" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-1.5 text-xs underline ${mine ? "text-primary-foreground" : "text-primary"}`}
    >
      <Paperclip className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{name}</span>
    </a>
  );
}
