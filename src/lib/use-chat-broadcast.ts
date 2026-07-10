"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

// Subscribes to the Realtime Broadcast channel for one chat thread and calls
// onMessage whenever anyone sends a message in it — consumers pass
// `() => router.refresh()`, matching the RSC-refresh convention already used
// throughout the app (see src/app/dashboard/level-up/request-button.tsx)
// rather than introducing client-side message state.
export function useChatBroadcast(threadId: string, onMessage: () => void) {
  useEffect(() => {
    const channel = getSupabaseBrowser()
      .channel(`chat-thread-${threadId}`)
      .on("broadcast", { event: "new_message" }, onMessage)
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
}
