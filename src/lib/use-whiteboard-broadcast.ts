"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { WhiteboardElement } from "@/lib/whiteboard-elements";
import type { WhiteboardCommentThreadItem } from "@/lib/whiteboard-comment-actions";

export type WhiteboardPresenceUser = { userId: string; name: string; avatarUrl: string | null };

// Live collaboration for one board — modeled on src/lib/use-chat-broadcast.ts
// (same getSupabaseBrowser() anon-key client, same Realtime Broadcast
// mechanism) but richer: chat only ever sends a coarse "something changed,
// go refetch" ping from the SERVER after a DB write; this sends the actual
// new `elements` array CLIENT-TO-CLIENT the moment a local edit completes,
// with no server round-trip, so a peer's change appears near-instantly
// instead of waiting on the next autosave+reload cycle. Confirmed via a
// standalone spike (two anon-key clients, one topic, no server involved)
// that this project's Supabase Realtime config allows anon-key
// client-to-client broadcast+presence with no extra auth setup needed.
//
// No live cursors (descoped by explicit request — cosmetic-only, highest
// effort of the whole feature) — just element sync and presence ("who's
// here right now"), so this hook never touches mouse/pointer events at all.
export function useWhiteboardBroadcast(
  boardId: string,
  currentUser: WhiteboardPresenceUser,
  onRemoteElements: (elements: WhiteboardElement[]) => void,
  // Optional — only the editor/viewer's comment layer cares about this
  // event; every other caller (there are none besides those two right now)
  // can simply omit it and the "comment_change" listener below just never
  // fires anything.
  onRemoteComments?: (threads: WhiteboardCommentThreadItem[]) => void
) {
  // Ref, not a dep — the channel's own broadcast listener is set up once per
  // boardId (see the effect below) and must always call the LATEST
  // onRemoteElements without re-subscribing the whole channel every time the
  // editor re-renders (which would drop/reattach presence on every render).
  const onRemoteElementsRef = useRef(onRemoteElements);
  useEffect(() => {
    onRemoteElementsRef.current = onRemoteElements;
  }, [onRemoteElements]);
  const onRemoteCommentsRef = useRef(onRemoteComments);
  useEffect(() => {
    onRemoteCommentsRef.current = onRemoteComments;
  }, [onRemoteComments]);

  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null>(null);
  const [presentUsers, setPresentUsers] = useState<WhiteboardPresenceUser[]>([]);

  useEffect(() => {
    const channel = getSupabaseBrowser()
      .channel(`whiteboard-${boardId}`)
      .on("broadcast", { event: "element_change" }, ({ payload }) => {
        onRemoteElementsRef.current((payload as { elements: WhiteboardElement[] }).elements);
      })
      // Sent after ANY comment mutation (new thread, reply, resolve toggle —
      // see broadcastComments below) with the board's full current thread
      // list, same "whole array, not a diff" convention as element_change —
      // comment volume is small enough that this is simpler than patching.
      .on("broadcast", { event: "comment_change" }, ({ payload }) => {
        onRemoteCommentsRef.current?.((payload as { threads: WhiteboardCommentThreadItem[] }).threads);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<WhiteboardPresenceUser>();
        // A user with the board open in 2 tabs tracks 2 presence refs under
        // the same userId — collapse to one avatar per person, and never
        // show the current viewer their own avatar in "who else is here."
        const byUserId = new Map<string, WhiteboardPresenceUser>();
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (entry.userId !== currentUser.userId) byUserId.set(entry.userId, entry);
          }
        }
        setPresentUsers([...byUserId.values()]);
      });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track(currentUser);
      }
    });
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, currentUser.userId, currentUser.name]);

  const broadcastElements = useCallback((elements: WhiteboardElement[]) => {
    channelRef.current?.send({ type: "broadcast", event: "element_change", payload: { elements } });
  }, []);

  const broadcastComments = useCallback((threads: WhiteboardCommentThreadItem[]) => {
    channelRef.current?.send({ type: "broadcast", event: "comment_change", payload: { threads } });
  }, []);

  return { presentUsers, broadcastElements, broadcastComments };
}
