import type { WhiteboardPresenceUser } from "@/lib/use-whiteboard-broadcast";
import { UserAvatar } from "@/components/ui/user-avatar";

// Extracted out of whiteboard-editor.tsx (its original home) so
// whiteboard-viewer.tsx can render the exact same "who's here right now"
// strip without duplicating the markup — a Viewer/Commenter still joins
// the same Realtime Presence channel via useWhiteboardBroadcast, they just
// never call its broadcastElements.
export function PresenceAvatars({ users }: { users: WhiteboardPresenceUser[] }) {
  if (users.length === 0) return null;
  return (
    <>
      <span className="h-4 w-px bg-border" />
      <div className="flex items-center -space-x-2" title={users.map((u) => u.name).join(", ")}>
        {users.slice(0, 4).map((user) => (
          <UserAvatar
            key={user.userId}
            src={user.avatarUrl}
            name={user.name}
            size={24}
            className="border-2 border-surface text-[10px]"
          />
        ))}
        {users.length > 4 && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-border text-[10px] font-semibold text-muted">
            +{users.length - 4}
          </span>
        )}
      </div>
    </>
  );
}
