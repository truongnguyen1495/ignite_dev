"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Send, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { WhiteboardCommentThreadItem } from "@/lib/whiteboard-comment-actions";
import type { Viewport } from "./whiteboard-canvas";

// Where a brand-new pin lands by default — just outside the element's own
// top-right corner (matches the reference video), not on top of its
// content. Draggable to anywhere around the element afterward — see
// startAnchorDrag below — so this is only ever the STARTING point.
export const DEFAULT_ANCHOR_U = 1;
export const DEFAULT_ANCHOR_V = 0;
// How far outside the element's own [0,1] box the pin can be dragged —
// generous enough to sit clearly off an edge/corner without wandering so
// far it reads as unattached.
const ANCHOR_RANGE_MIN = -0.35;
const ANCHOR_RANGE_MAX = 1.35;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

type ElementBox = { x: number; y: number; width: number; height: number };

// Small composer used both for a brand-new pending pin (no thread yet) and
// for the reply row at the bottom of an open thread — same "type + send"
// shape either way, just a different placeholder/submit handler.
function ComposerInput({
  placeholder,
  autoFocus,
  onSubmit,
}: {
  placeholder: string;
  autoFocus?: boolean;
  onSubmit: (content: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit(value.trim());
            setValue("");
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-border-strong bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
      />
      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => {
          if (!value.trim()) return;
          onSubmit(value.trim());
          setValue("");
        }}
        aria-label="Gửi"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary-bg disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ThreadPanel({
  thread,
  onReply,
  onToggleResolved,
  onClose,
}: {
  thread: WhiteboardCommentThreadItem;
  onReply: (content: string) => void;
  onToggleResolved: (resolved: boolean) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute left-2 top-2 z-10 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <button
            type="button"
            onClick={() => onToggleResolved(!thread.resolved)}
            aria-pressed={thread.resolved}
            aria-label="Đánh dấu đã xử lý"
            className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${thread.resolved ? "bg-success" : "bg-faint-bg"}`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${thread.resolved ? "translate-x-3.5" : "translate-x-0.5"}`}
            />
          </button>
          Resolve
        </label>
        <button type="button" onClick={onClose} aria-label="Đóng" className="text-muted hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-56 space-y-0.5 overflow-y-auto">
        {thread.comments.map((c) => (
          <div key={c.id} className="flex gap-2 px-3 py-2">
            <UserAvatar src={c.authorAvatarUrl} name={c.authorName} size={24} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                <span className="text-[10px] text-faint">
                  {new Date(c.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="break-words text-xs text-muted">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-2.5 py-2">
        <ComposerInput placeholder="Trả lời..." onSubmit={onReply} />
      </div>
    </div>
  );
}

// One pin — a collapsed avatar badge that opens/closes its thread on a
// plain click, or repositions around its element on a drag (see the
// reference video: "bong bóng bình luận có thể di chuyển quanh đối
// tượng"). A single pointer gesture has to decide which one happened —
// resolved by a movement threshold: under it, it's a click; past it, it's
// a drag, committed on release rather than continuously (matches every
// other drag gesture in whiteboard-canvas.tsx — live preview, one write at
// the end).
function Pin({
  thread,
  box,
  viewport,
  rootRef,
  isOpen,
  onToggleOpen,
  onReply,
  onToggleResolved,
  onMoveAnchor,
}: {
  thread: WhiteboardCommentThreadItem;
  box: ElementBox;
  viewport: Viewport;
  rootRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onToggleOpen: () => void;
  onReply: (content: string) => void;
  onToggleResolved: (resolved: boolean) => void;
  onMoveAnchor: (anchorU: number, anchorV: number) => void;
}) {
  const [dragAnchor, setDragAnchor] = useState<{ u: number; v: number } | null>(null);
  const dragAnchorRef = useRef<{ u: number; v: number } | null>(null);

  const anchorU = dragAnchor?.u ?? thread.anchorU;
  const anchorV = dragAnchor?.v ?? thread.anchorV;
  const screenX = (box.x + anchorU * box.width) * viewport.zoom + viewport.x;
  const screenY = (box.y + anchorV * box.height) * viewport.zoom + viewport.y;

  function onPointerDown(e: React.MouseEvent) {
    e.stopPropagation();
    // Without this, dragging the pin is interpreted as a native
    // text-selection drag — same fix as the connector anchor dots in
    // whiteboard-canvas.tsx.
    e.preventDefault();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let moved = false;

    function onMove(ev: MouseEvent) {
      if (!moved && Math.hypot(ev.clientX - startClientX, ev.clientY - startClientY) > 4) moved = true;
      if (!moved) return;
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const worldX = (ev.clientX - rect.left - viewport.x) / viewport.zoom;
      const worldY = (ev.clientY - rect.top - viewport.y) / viewport.zoom;
      const next = {
        u: clamp((worldX - box.x) / box.width, ANCHOR_RANGE_MIN, ANCHOR_RANGE_MAX),
        v: clamp((worldY - box.y) / box.height, ANCHOR_RANGE_MIN, ANCHOR_RANGE_MAX),
      };
      dragAnchorRef.current = next;
      setDragAnchor(next);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (moved && dragAnchorRef.current) {
        onMoveAnchor(dragAnchorRef.current.u, dragAnchorRef.current.v);
      } else if (!moved) {
        onToggleOpen();
      }
      dragAnchorRef.current = null;
      setDragAnchor(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const last = thread.comments[thread.comments.length - 1];
  if (!last) return null;

  return (
    <div className="pointer-events-auto absolute" style={{ left: screenX, top: screenY }}>
      <button
        type="button"
        onMouseDown={onPointerDown}
        title={last.content}
        aria-label="Mở bình luận"
        className={`flex h-8 w-8 -translate-x-1.5 -translate-y-7 cursor-grab items-center justify-center rounded-full rounded-bl-none border-2 border-white shadow-lg active:cursor-grabbing ${
          thread.resolved ? "bg-faint" : ""
        }`}
      >
        {thread.resolved ? <Check className="h-4 w-4 text-white" /> : <UserAvatar src={last.authorAvatarUrl} name={last.authorName} size={28} />}
      </button>
      {isOpen && (
        <ThreadPanel thread={thread} onReply={onReply} onToggleResolved={onToggleResolved} onClose={onToggleOpen} />
      )}
    </div>
  );
}

// Shared by both the editor (whiteboard-canvas.tsx) and the read-only
// viewer (whiteboard-viewer.tsx) — commenting must work for VIEWER/
// COMMENTER-role people, who only ever reach the viewer (see
// requireWhiteboardAccess's role tiers). Lives in SCREEN space (manually
// converting each thread's element-relative anchor via viewport), a
// sibling of the pan/zoom-transformed world div — same reasoning as
// SelectionToolbar and the marquee overlay: a pin must stay a fixed
// on-screen size and clickable regardless of how zoomed out the board is.
export function CommentPins({
  threads,
  elementsById,
  viewport,
  composingForElementId,
  onCancelComposing,
  onPlaceThread,
  onReply,
  onToggleResolved,
  onMoveAnchor,
}: {
  threads: WhiteboardCommentThreadItem[];
  elementsById: Map<string, ElementBox>;
  viewport: Viewport;
  // Non-null while the SelectionToolbar's comment button has armed a
  // brand-new pin on this element, composer open, not saved yet.
  composingForElementId: string | null;
  onCancelComposing: () => void;
  onPlaceThread: (content: string) => void;
  onReply: (threadId: string, content: string) => void;
  onToggleResolved: (threadId: string, resolved: boolean) => void;
  onMoveAnchor: (threadId: string, anchorU: number, anchorV: number) => void;
}) {
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const composingBox = composingForElementId ? elementsById.get(composingForElementId) : null;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-40">
      {threads.map((t) => {
        const box = elementsById.get(t.elementId);
        // The element this thread was pinned to no longer exists — same
        // "just stop rendering" convention as a connector pointing at a
        // deleted element (see connector-layer.tsx).
        if (!box) return null;
        return (
          <Pin
            key={t.id}
            thread={t}
            box={box}
            viewport={viewport}
            rootRef={rootRef}
            isOpen={openThreadId === t.id}
            onToggleOpen={() => setOpenThreadId((id) => (id === t.id ? null : t.id))}
            onReply={(content) => onReply(t.id, content)}
            onToggleResolved={(resolved) => onToggleResolved(t.id, resolved)}
            onMoveAnchor={(u, v) => onMoveAnchor(t.id, u, v)}
          />
        );
      })}
      {composingBox && (
        <div
          className="pointer-events-auto absolute w-64 -translate-x-1.5 -translate-y-9 rounded-xl border border-primary-border bg-surface p-2 shadow-xl"
          style={{
            left: (composingBox.x + DEFAULT_ANCHOR_U * composingBox.width) * viewport.zoom + viewport.x,
            top: (composingBox.y + DEFAULT_ANCHOR_V * composingBox.height) * viewport.zoom + viewport.y,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ComposerInput placeholder="Nhập bình luận..." autoFocus onSubmit={onPlaceThread} />
          <button type="button" onClick={onCancelComposing} className="mt-1 text-[11px] text-muted hover:text-foreground">
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
