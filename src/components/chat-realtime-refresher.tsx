"use client";

import { useRouter } from "next/navigation";
import { useChatBroadcast } from "@/lib/use-chat-broadcast";

// Invisible — subscribes to the thread's realtime channel and refreshes the
// (server-rendered) message list whenever a broadcast arrives, so the
// message list itself can stay a plain Server Component.
export function ChatRealtimeRefresher({ threadId }: { threadId: string }) {
  const router = useRouter();
  useChatBroadcast(threadId, () => router.refresh());
  return null;
}
