"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toPng } from "html-to-image";
import {
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize,
  PanelRightOpen,
  PanelRightClose,
  Pencil,
  Download,
  Upload,
  Image as ImageIcon,
  FileJson,
  Group as GroupIcon,
  Ungroup,
} from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ShareDialog } from "./share-dialog";
import { PresenceAvatars } from "./presence-avatars";
import type { ConnectorElement, PlaceableType, PositionedWhiteboardElement, ShapeKind, WhiteboardElement } from "@/lib/whiteboard-elements";
import {
  createDefaultElement,
  isConnector,
  isTextElement,
  convertTextElementKind,
  whiteboardElementsPayloadSchema,
} from "@/lib/whiteboard-elements";
import { uploadWhiteboardFile } from "@/lib/whiteboard-client-utils";
import { useWhiteboardBroadcast } from "@/lib/use-whiteboard-broadcast";
import {
  createWhiteboardCommentThreadAction,
  addWhiteboardCommentReplyAction,
  setWhiteboardCommentThreadResolvedAction,
  moveWhiteboardCommentThreadAnchorAction,
  type WhiteboardCommentThreadItem,
} from "@/lib/whiteboard-comment-actions";
import { findChildElements, findParentConnector, placeNewChild, placeNewSibling } from "./mindmap-layout";
import { ElementToolbar, type WhiteboardTool } from "./element-toolbar";
import { WhiteboardCanvas, type Viewport, MIN_ZOOM, MAX_ZOOM } from "./whiteboard-canvas";
import { PropertyPanel } from "./property-panel";

// Non-text <input> types (range, color, checkbox...) deliberately do NOT
// count as "editing text" — they hold focus after a single click/drag same
// as any text field, but nothing about using them involves typing, so
// blocking every keyboard shortcut while one has focus serves no purpose.
// The pen tool's own brush-size slider (element-toolbar.tsx's
// PenSettingsPopover) is exactly this case: without this carve-out, Ctrl+Z
// silently did nothing right after dragging it, since focus was still
// sitting on the <input type="range"> when the shortcut fired.
const NON_TEXT_INPUT_TYPES = new Set(["range", "color", "checkbox", "radio", "button", "submit", "file", "reset"]);

function isEditingText(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === "TEXTAREA" || el.isContentEditable) return true;
  if (el.tagName === "INPUT") return !NON_TEXT_INPUT_TYPES.has((el as HTMLInputElement).type);
  return false;
}

const MAX_HISTORY = 50;
const AUTOSAVE_DELAY_MS = 1500;

const FIT_PADDING_PX = 80;
const PROPERTY_PANEL_PX = 288;

// A pasted screenshot can be several thousand px on a side (a full monitor
// capture) — dropped at 1:1 it would dwarf the board. Scale it down to fit
// within a square this big (still freely resizable afterward like any other
// image element) while keeping its aspect ratio; small images pass through
// unscaled.
const MAX_PASTED_IMAGE_DIM = 640;

function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = url;
  });
}

// Pure — takes an explicit element list rather than reading component state,
// so it can be reused right after importing a JSON file (see
// handleImportFile below) without waiting a frame for `positionedElements`
// to reflect the just-imported data. Approximates the canvas's on-screen
// size from the window (minus the property panel when open) rather than
// measuring the actual container DOM node — close enough for a "frame
// everything" computation, and avoids plumbing a ref down from
// WhiteboardCanvas just for this.
function viewportToFit(
  positioned: PositionedWhiteboardElement[],
  availableWidth: number,
  availableHeight: number
): Viewport {
  if (positioned.length === 0) return { x: 0, y: 0, zoom: 1 };
  const minX = Math.min(...positioned.map((el) => el.x));
  const minY = Math.min(...positioned.map((el) => el.y));
  const maxX = Math.max(...positioned.map((el) => el.x + el.width));
  const maxY = Math.max(...positioned.map((el) => el.y + el.height));
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(
      MIN_ZOOM,
      Math.min((availableWidth - FIT_PADDING_PX * 2) / contentWidth, (availableHeight - FIT_PADDING_PX * 2) / contentHeight)
    )
  );
  return {
    x: (availableWidth - contentWidth * zoom) / 2 - minX * zoom,
    y: (availableHeight - contentHeight * zoom) / 2 - minY * zoom,
    zoom,
  };
}

function newConnector(sourceId: string, targetId: string): ConnectorElement {
  return {
    id: crypto.randomUUID(),
    type: "connector",
    zIndex: 0,
    sourceId,
    sourceAnchor: "right",
    targetId,
    targetAnchor: "left",
    stroke: "#64748b",
    strokeWidth: 2,
    arrowStart: false,
    arrowEnd: true,
    kind: "curved",
    dash: "solid",
  };
}

export function WhiteboardEditor({
  boardId,
  title,
  initialElements,
  initialViewport,
  initialCommentThreads,
  onSave,
  onRename,
  backHref,
  canManageSharing,
  currentUser,
}: {
  boardId: string;
  title: string;
  initialElements: WhiteboardElement[];
  initialViewport: Viewport;
  initialCommentThreads: WhiteboardCommentThreadItem[];
  // Admin and student routes each wire their own server action here (their
  // access checks/gating differ — see requireWhiteboardAccess in
  // src/lib/access.ts) — this component itself stays route-agnostic, which
  // is the whole point of it living under src/components/whiteboard/
  // instead of one specific route's folder.
  onSave: (boardId: string, payload: unknown) => Promise<string | undefined>;
  onRename: (boardId: string, title: string) => Promise<string | undefined>;
  backHref: string;
  // Whether to render the Share button at all — computed server-side via
  // canManageWhiteboardSharing (src/lib/access.ts) by both page.tsx callers,
  // so this component doesn't need to re-derive the rule itself. The
  // ShareDialog's own actions re-check this server-side too (never trust a
  // client-passed boolean as the real access boundary), so hiding the
  // button here is purely a UX nicety, not the actual gate.
  canManageSharing: boolean;
  // Drives presence ("who's here right now") and lets the live-sync hook
  // below tell this viewer's own broadcasts apart from a peer's.
  currentUser: { id: string; name: string; avatarUrl: string | null };
}) {
  const [elements, setElements] = useState<WhiteboardElement[]>(initialElements);
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  // Local copy so the floating title pill can rename in place (see the
  // header JSX below) without a full reload — renameWhiteboardAction only
  // revalidates the list page's cache, not this already-mounted client
  // component, so the displayed title has to update itself here too.
  const [boardTitle, setBoardTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [renamePending, startRenameTransition] = useTransition();
  // "hand" = Miro's dedicated pan tool: left-drag anywhere (including over
  // an element) pans the canvas instead of selecting/dragging it. Space-held
  // and middle-mouse-drag panning (see whiteboard-canvas.tsx) work
  // regardless of this and don't change it — this is only the STICKY toggle
  // a click on the hand icon turns on.
  const [activeTool, setActiveTool] = useState<WhiteboardTool>("select");
  // Non-null while the toolbar's Ghi chú/Hình khối/Chữ/Ảnh/Video/Link button
  // is "armed" — the element itself isn't created yet; the next click on the
  // canvas (see WhiteboardCanvas's placingType handling) is what actually
  // places it, mirroring how the connector/pen tools already require a
  // canvas action rather than firing on the toolbar click itself. Cleared
  // back to null the moment something gets placed (or the gesture is
  // cancelled), so it's always a one-shot arm-then-place, not a sticky mode.
  const [placingType, setPlacingType] = useState<PlaceableType | null>(null);
  // Pen tool's own color/brush size — plain component state (not persisted
  // to the board), same as reference offline-sketch's in-memory `state`:
  // it only ever affects the NEXT stroke drawn, so there's nothing here
  // worth surviving a reload.
  const [penColor, setPenColor] = useState("#18181b");
  const [penSize, setPenSize] = useState(4);
  // Hidden by default and only ever flipped by the floating toggle button
  // below — deliberately NOT auto-opened by selecting an element (an
  // earlier version showed it the instant anything was selected, which the
  // user found intrusive; this state is untouched by selectedElementIds
  // changes so it stays exactly as the user last left it).
  const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
  // Which sticky (if any) currently has its inline canvas <textarea> open —
  // see whiteboard-canvas.tsx's double-click handler. Lifted here (not
  // local state in the canvas) so addElement below can also open it the
  // instant a brand-new sticky is dropped, skipping the extra double-click.
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const confirm = useConfirm();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const pastRef = useRef<WhiteboardElement[][]>([]);
  const futureRef = useRef<WhiteboardElement[][]>([]);
  const elementsRef = useRef(elements);
  const viewportRef = useRef(viewport);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const clipboardRef = useRef<WhiteboardElement[] | null>(null);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const commitElements = useCallback((updater: (prev: WhiteboardElement[]) => WhiteboardElement[]) => {
    setElements((prev) => {
      const next = updater(prev);
      pastRef.current = [...pastRef.current, prev].slice(-MAX_HISTORY);
      futureRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      return next;
    });
    setIsDirty(true);
  }, []);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [...futureRef.current, elementsRef.current];
    setElements(previous);
    setIsDirty(true);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[future.length - 1];
    futureRef.current = future.slice(0, -1);
    pastRef.current = [...pastRef.current, elementsRef.current];
    setElements(next);
    setIsDirty(true);
    setCanRedo(futureRef.current.length > 0);
    setCanUndo(true);
  }, []);

  // Live collaboration: applies a peer's just-broadcast `elements` array
  // straight to local state, bypassing commitElements entirely — a remote
  // update must NOT land on this viewer's own undo stack (pressing Ctrl+Z
  // here should only ever undo something THIS person did, never a peer's
  // edit) and must NOT mark the board dirty (the peer who made the edit
  // already owns writing it to the DB via their own autosave; re-saving it
  // here too would just be a redundant write of the same data).
  //
  // It also CLEARS this viewer's local undo/redo history (pastRef/futureRef)
  // rather than merely skipping the push onto it — this was tried first and
  // found to be insufficient: pastRef's existing snapshots were captured
  // BEFORE the peer's edit arrived, so undo would still revert to one of
  // them wholesale, silently discarding the peer's just-added content along
  // with whatever this viewer actually meant to undo (confirmed with two
  // real sessions: peer adds an element, then Ctrl+Z here wiped BOTH
  // elements instead of just this viewer's own). This app's "whole-array,
  // last-write-wins" model (see the Whiteboard schema comment) has no
  // per-element diff to rebase old snapshots against, so the safe, simple
  // choice is: once someone else's edit has been folded in, Ctrl+Z here
  // stops being able to reach further back than that moment — Undo
  // temporarily unavailable is an acceptable cost; silently deleting a
  // peer's work is not.
  // A flag, not an object-identity check against the applied array — an
  // earlier version compared `elements === lastAppliedRemoteRef.current` in
  // the broadcast effect below, which looked right but broke on a real
  // sequence: remote array R arrives and gets pushed onto pastRef by the
  // NEXT local commit (pastRef stores `prev` by reference, uncloned); a
  // later Ctrl+Z pops that same snapshot back out via setElements(R) — same
  // reference, but now from a genuinely local action that SHOULD broadcast.
  // The identity check silently treated that undo as "just a remote echo"
  // and never sent it, so a peer's own undo of their own action stopped
  // propagating (confirmed with two real sessions this way). A one-shot
  // flag set immediately before this SPECIFIC setElements call and cleared
  // by the very next effect run has no such coincidental-reuse failure
  // mode — it only ever tracks "was the last elements change THIS call."
  const skipNextBroadcastRef = useRef(false);
  const applyRemoteElements = useCallback((remote: WhiteboardElement[]) => {
    skipNextBroadcastRef.current = true;
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setElements(remote);
  }, []);

  const [commentThreads, setCommentThreads] = useState<WhiteboardCommentThreadItem[]>(initialCommentThreads);

  const { presentUsers, broadcastElements, broadcastComments } = useWhiteboardBroadcast(
    boardId,
    { userId: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
    applyRemoteElements,
    // Comments have no local undo/dirty-tracking of their own (each
    // mutation already round-trips the DB via a server action, unlike
    // elements' local-first + debounced-autosave model), so a remote update
    // just replaces state directly — no skip-flag/history dance needed.
    setCommentThreads
  );

  async function placeCommentThread(elementId: string, anchorU: number, anchorV: number, content: string) {
    const result = await createWhiteboardCommentThreadAction(boardId, elementId, anchorU, anchorV, content);
    if (result.threads) {
      setCommentThreads(result.threads);
      broadcastComments(result.threads);
    }
  }

  async function replyToComment(threadId: string, content: string) {
    const result = await addWhiteboardCommentReplyAction(boardId, threadId, content);
    if (result.threads) {
      setCommentThreads(result.threads);
      broadcastComments(result.threads);
    }
  }

  async function toggleCommentResolved(threadId: string, resolved: boolean) {
    const result = await setWhiteboardCommentThreadResolvedAction(boardId, threadId, resolved);
    if (result.threads) {
      setCommentThreads(result.threads);
      broadcastComments(result.threads);
    }
  }

  async function moveCommentAnchor(threadId: string, anchorU: number, anchorV: number) {
    const result = await moveWhiteboardCommentThreadAnchorAction(boardId, threadId, anchorU, anchorV);
    if (result.threads) {
      setCommentThreads(result.threads);
      broadcastComments(result.threads);
    }
  }

  // Broadcasts every LOCAL change to `elements` (commitElements, undo,
  // redo — every local mutation path funnels through one of these three
  // setElements calls) to any peer with this board open, moments after it
  // happens — not on a debounce like the DB autosave below, since the whole
  // point is peers seeing it near-instantly. Skips the render right after
  // applyRemoteElements itself just set `elements` (see skipNextBroadcastRef
  // above) — without this, two peers would just echo the same update back
  // and forth at each other forever. Also skips the very first render (the
  // board's initial DB-loaded state), which every peer already has
  // independently from their own page load.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (skipNextBroadcastRef.current) {
      skipNextBroadcastRef.current = false;
      return;
    }
    broadcastElements(elements);
  }, [elements, broadcastElements]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const doSave = useCallback(() => {
    setError(undefined);
    startTransition(async () => {
      const result = await onSave(boardId, {
        elements: elementsRef.current,
        viewportX: viewportRef.current.x,
        viewportY: viewportRef.current.y,
        viewportZoom: viewportRef.current.zoom,
      });
      if (result) {
        setError(result);
        return;
      }
      // No router.refresh() here on purpose — this fires on every debounced
      // autosave tick (every ~1.5s while actively editing), and a full
      // server-component refetch/re-render on each one caused a visible
      // stutter mid-drag/mid-type. The server action already revalidates
      // this path (saveWhiteboardAction), so the next real navigation still
      // sees fresh data; this client state is already the source of truth
      // for what's on screen right now.
      setIsDirty(false);
    });
  }, [boardId, onSave]);

  // Debounced autosave — still just "save a bit after the last change," on
  // top of (not replaced by) the live broadcast above: the broadcast is
  // peer-to-peer and never touches the DB, so this is still what actually
  // persists a change for the next person who opens the board later. Last
  // write to actually land here wins, same DB-level convention as before
  // live sync existed.
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(doSave, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isDirty, elements, doSave]);

  const selectedElement =
    selectedElementIds.length === 1 ? (elements.find((el) => el.id === selectedElementIds[0]) ?? null) : null;
  const positionedElements = elements.filter((el): el is PositionedWhiteboardElement => !isConnector(el));

  function updateElement(elementId: string, patch: Partial<WhiteboardElement>) {
    commitElements((prev) => prev.map((el) => (el.id === elementId ? ({ ...el, ...patch } as WhiteboardElement) : el)));
  }

  function updateElements(patches: { id: string; patch: Partial<WhiteboardElement> }[]) {
    const byId = new Map(patches.map((p) => [p.id, p.patch]));
    commitElements((prev) => prev.map((el) => (byId.has(el.id) ? ({ ...el, ...byId.get(el.id) } as WhiteboardElement) : el)));
  }

  function deleteSelected() {
    if (selectedElementIds.length === 0) return;
    const ids = new Set(selectedElementIds);
    // Cascade: a connector left pointing at a deleted element would just
    // stop rendering (connector-layer.tsx no-ops on a missing endpoint), but
    // leaving it in the saved array forever is needless clutter.
    commitElements((prev) =>
      prev.filter((el) => {
        if (ids.has(el.id)) return false;
        if (isConnector(el) && (ids.has(el.sourceId) || ids.has(el.targetId))) return false;
        return true;
      })
    );
    setSelectedElementIds([]);
    setEditingElementId(null);
  }

  // Closing the inline editor on a standalone Text element that was never
  // typed into (added via T/toolbar, then immediately clicked away from)
  // quietly removes it instead of leaving an invisible, content-less
  // element sitting on the board forever — matches the reference
  // offline-whiteboard app's own behavior. Deliberately NOT applied to
  // sticky notes/shapes: a blank yellow note is a normal thing to leave for
  // later, unlike a bare Text element, which has no visual presence at all
  // once empty.
  function stopEditing() {
    const editing = elements.find((el) => el.id === editingElementId);
    if (editing && editing.type === "text" && !editing.content.trim()) {
      commitElements((prev) => prev.filter((el) => el.id !== editing.id));
      setSelectedElementIds((prev) => prev.filter((id) => id !== editing.id));
    }
    setEditingElementId(null);
  }

  // shapeKind is only meaningful when type === "shape" — used by the R/O
  // keyboard shortcuts below to drop a rectangle or ellipse directly instead
  // of always landing on createDefaultElement's "rectangle" default and
  // making the admin change it afterward via the toolbar. Reads
  // viewportRef.current (not the `viewport` state variable) for the same
  // reason the paste handler below does — this is now also called from the
  // keydown effect's handler, which only re-subscribes when
  // selectedElementIds/elements/activeTool change, not on every pan/zoom
  // tick; closing over the `viewport` prop directly would silently center
  // new elements on a stale, pre-pan/zoom viewport until something else
  // happened to trigger a re-subscribe.
  function addElement(type: PlaceableType, shapeKind?: ShapeKind) {
    setPlacingType(null);
    const v = viewportRef.current;
    const worldX = (window.innerWidth / 2 - 190 - v.x) / v.zoom;
    const worldY = (window.innerHeight / 2 - v.y) / v.zoom;
    const base = createDefaultElement(type, crypto.randomUUID(), { x: worldX, y: worldY });
    const element = shapeKind && base.type === "shape" ? { ...base, kind: shapeKind } : base;
    commitElements((prev) => [...prev, element]);
    setSelectedElementIds([element.id]);
    // Skip the extra double-click for the common case — a freshly-dropped
    // sticky/text opens straight into typing.
    if (type === "sticky" || type === "text") setEditingElementId(element.id);
  }

  function addConnector(connector: ConnectorElement) {
    commitElements((prev) => [...prev, connector]);
  }

  // Arms/disarms placingType — clicking the same toolbar button again
  // cancels, same toggle convention as the connector/pen/eraser tool
  // buttons in ElementToolbar. Also clears selection/editing so nothing
  // looks selected while the admin is choosing where to click next.
  function startPlacing(type: PlaceableType) {
    setPlacingType((prev) => (prev === type ? null : type));
    setSelectedElementIds([]);
    setEditingElementId(null);
  }

  // Creates a real element CENTERED on a world-space point (unlike
  // createDefaultElement's `at`, which is the top-left corner) — shared by
  // the toolbar's click-to-place flow above and addStickyAt's
  // double-click-on-empty-canvas shortcut below.
  function placeElementAt(type: PlaceableType, worldX: number, worldY: number) {
    const defaults = createDefaultElement(type, crypto.randomUUID(), { x: 0, y: 0 });
    const element = { ...defaults, x: worldX - defaults.width / 2, y: worldY - defaults.height / 2 };
    commitElements((prev) => [...prev, element]);
    setSelectedElementIds([element.id]);
    setPlacingType(null);
    if (type === "sticky" || type === "text") setEditingElementId(element.id);
  }

  // Turns a finished pen stroke's raw world-space points into a real
  // "drawing" element — padded by half the stroke width (plus a couple px)
  // so a perfectly horizontal/vertical line still gets a non-zero box and
  // its ink isn't clipped right at the edge, then re-expressed relative to
  // that box's own top-left so WhiteboardElementRenderer's viewBox math
  // (see its "drawing" case) lines up exactly with what was actually drawn.
  function addDrawing(worldPoints: { x: number; y: number }[], color: string, strokeWidth: number) {
    const xs = worldPoints.map((p) => p.x);
    const ys = worldPoints.map((p) => p.y);
    const pad = strokeWidth / 2 + 2;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...xs) + pad;
    const maxY = Math.max(...ys) + pad;
    const element: WhiteboardElement = {
      id: crypto.randomUUID(),
      type: "drawing",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      zIndex: 0,
      groupId: null,
      points: worldPoints.map((p) => ({ x: p.x - minX, y: p.y - minY })),
      color,
      strokeWidth,
    };
    commitElements((prev) => [...prev, element]);
    setSelectedElementIds([element.id]);
  }

  // Backs the stroke-eraser tool — one commitElements call for the WHOLE
  // drag (see onEraseDrawings in whiteboard-canvas.tsx, which only calls
  // this once on mouseup with every id it passed over), so Ctrl+Z undoes an
  // entire erase gesture in one step rather than one step per stroke.
  // Mirrors deleteSelected's own connector-cascade below — a connector
  // someone dragged onto a drawing (allowed, same as any other element) is
  // cleaned up the same way rather than left dangling.
  function eraseDrawings(ids: string[]) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    commitElements((prev) =>
      prev.filter((el) => {
        if (idSet.has(el.id)) return false;
        if (isConnector(el) && (idSet.has(el.sourceId) || idSet.has(el.targetId))) return false;
        return true;
      })
    );
    setSelectedElementIds((prev) => prev.filter((id) => !idSet.has(id)));
  }

  // Backs whiteboard-canvas.tsx's double-click-on-empty-canvas handler — a
  // one-step shortcut to a new sticky centered on wherever the admin
  // actually double-clicked, without first having to arm the toolbar button.
  function addStickyAt(worldX: number, worldY: number) {
    placeElementAt("sticky", worldX, worldY);
  }

  function placeElementCopies(source: WhiteboardElement[]) {
    const idMap = new Map(source.map((el) => [el.id, crypto.randomUUID()]));
    // A duplicated group must become its OWN independent group, never
    // silently merge into the original's groupId — otherwise moving/
    // resizing either copy would drag the other along with it. Only
    // groupIds actually present among the copied elements get a fresh id;
    // anything ungrouped stays ungrouped.
    const groupIdMap = new Map<string, string>();
    const copies = source.map((el) => {
      const id = idMap.get(el.id)!;
      if (isConnector(el)) {
        return { ...structuredClone(el), id, sourceId: idMap.get(el.sourceId) ?? el.sourceId, targetId: idMap.get(el.targetId) ?? el.targetId };
      }
      let groupId: string | null = null;
      if (el.groupId) {
        if (!groupIdMap.has(el.groupId)) groupIdMap.set(el.groupId, crypto.randomUUID());
        groupId = groupIdMap.get(el.groupId)!;
      }
      return { ...structuredClone(el), id, x: el.x + 20, y: el.y + 20, groupId };
    });
    commitElements((prev) => [...prev, ...copies]);
    setSelectedElementIds(copies.map((c) => c.id));
  }

  // A marquee/shift-click selection of several notes never includes the
  // connector between them (only the notes themselves — selecting a
  // connector is its own separate click, on the line). Without this, Ctrl+D
  // on two connected notes silently dropped the connector between the
  // copies, leaving the admin to redraw it by hand every time. Only pulls in
  // a connector whose BOTH ends are already in the selection — one dangling
  // off to an unselected element is left alone, same as offline-whiteboard's
  // own duplicateSelected does it.
  function withInternalConnectors(selected: WhiteboardElement[]): WhiteboardElement[] {
    const ids = new Set(selected.map((el) => el.id));
    const internalConnectors = elements.filter(
      (el): el is ConnectorElement => isConnector(el) && !ids.has(el.id) && ids.has(el.sourceId) && ids.has(el.targetId)
    );
    return [...selected, ...internalConnectors];
  }

  function duplicateSelected() {
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    if (selected.length > 0) placeElementCopies(withInternalConnectors(selected));
  }

  function copySelected() {
    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    if (selected.length > 0) clipboardRef.current = withInternalConnectors(selected);
  }

  function pasteClipboard() {
    if (clipboardRef.current) placeElementCopies(clipboardRef.current);
  }

  // The groupId every currently-selected element shares, or null if the
  // selection isn't a single whole group — either fewer than 2 selected,
  // members disagree on groupId, or the selection is missing some of that
  // group's own members (e.g. a marquee that only caught part of it before
  // whiteboard-canvas.tsx's own group-expansion logic ran). Backs both the
  // side panel's Group/Ungroup button label and Ctrl+G's own decision.
  function selectedWholeGroupId(): string | null {
    if (selectedElementIds.length < 2) return null;
    const selected = positionedElements.filter((el) => selectedElementIds.includes(el.id));
    const groupId = selected[0]?.groupId;
    if (!groupId || !selected.every((el) => el.groupId === groupId)) return null;
    const allMembers = positionedElements.filter((el) => el.groupId === groupId);
    return allMembers.length === selected.length ? groupId : null;
  }

  // Connectors are deliberately left untouched (never grouped) — they
  // already travel with their endpoints for free since a connector's shape
  // is recomputed from its live source/target elements every render.
  function groupSelected() {
    const ids = selectedElementIds;
    if (ids.length < 2) return;
    const groupId = crypto.randomUUID();
    commitElements((prev) => prev.map((el) => (ids.includes(el.id) && !isConnector(el) ? { ...el, groupId } : el)));
  }

  function ungroupSelected() {
    const ids = selectedElementIds;
    if (ids.length < 2) return;
    commitElements((prev) => prev.map((el) => (ids.includes(el.id) && !isConnector(el) ? { ...el, groupId: null } : el)));
  }

  function moveElementLayer(elementId: string, direction: "front" | "back") {
    // Connectors are excluded from this range on purpose — they render as a
    // separate SVG overlay (connector-layer.tsx), never interleaved with
    // positioned elements via zIndex, but every connector is CREATED with
    // zIndex: 0. Including them here skewed the front/back target toward
    // whatever a connector happened to be sitting at, rather than the
    // actual range of the positioned elements this button is meant to
    // reorder.
    const others = elements.filter((el) => el.id !== elementId && !isConnector(el)).map((el) => el.zIndex);
    const target = direction === "front" ? (others.length ? Math.max(...others) + 1 : 1) : others.length ? Math.min(...others) - 1 : -1;
    updateElement(elementId, { zIndex: target });
  }

  // Backs the floating toolbar's "change shape" control — replaces the
  // single selected sticky/shape element with a different kind, in place
  // (same id, so any connector pointing at it stays valid; see
  // convertTextElementKind's own doc comment for the field-mapping rules).
  function convertSelectedKind(target: "sticky" | ShapeKind) {
    if (selectedElementIds.length !== 1) return;
    const current = elements.find((el) => el.id === selectedElementIds[0]);
    if (!current || !isTextElement(current)) return;
    const converted = convertTextElementKind(current, target);
    commitElements((prev) => prev.map((el) => (el.id === converted.id ? converted : el)));
  }

  function nudgeSelected(dx: number, dy: number) {
    const patches = positionedElements
      .filter((el) => selectedElementIds.includes(el.id))
      .map((el) => ({ id: el.id, patch: { x: el.x + dx, y: el.y + dy } }));
    if (patches.length > 0) updateElements(patches);
  }

  // Tab = add a child node (connected) to the single selected node, stacked
  // below its existing children. Enter = add a sibling in the same column.
  // Both are keyboard-only mindmap ergonomics on top of the generic
  // sticky+connector primitives — no dedicated "mindmap node" type exists.
  function addMindmapChild() {
    if (selectedElementIds.length !== 1) return;
    const parent = positionedElements.find((el) => el.id === selectedElementIds[0]);
    if (!parent) return;
    const siblings = findChildElements(elements, parent.id);
    const pos = placeNewChild(parent, siblings);
    const node = { ...createDefaultElement("sticky", crypto.randomUUID(), { x: pos.x, y: pos.y }), width: pos.width, height: pos.height };
    commitElements((prev) => [...prev, node, newConnector(parent.id, node.id)]);
    setSelectedElementIds([node.id]);
  }

  function addMindmapSibling() {
    if (selectedElementIds.length !== 1) return;
    const node = positionedElements.find((el) => el.id === selectedElementIds[0]);
    if (!node) return;
    const parentConnector = findParentConnector(elements, node.id);
    if (!parentConnector) {
      const sibling = createDefaultElement("sticky", crypto.randomUUID(), { x: node.x, y: node.y + node.height + 24 });
      commitElements((prev) => [...prev, sibling]);
      setSelectedElementIds([sibling.id]);
      return;
    }
    const parent = positionedElements.find((el) => el.id === parentConnector.sourceId);
    if (!parent) return;
    const siblings = findChildElements(elements, parent.id).filter((el) => el.id !== node.id);
    const pos = placeNewSibling(node, siblings);
    const sibling = { ...createDefaultElement("sticky", crypto.randomUUID(), { x: pos.x, y: pos.y }), width: pos.width, height: pos.height };
    commitElements((prev) => [...prev, sibling, newConnector(parent.id, sibling.id)]);
    setSelectedElementIds([sibling.id]);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditingText(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;

      // Miro's own shortcut for the hand/pan tool — checked before the mod
      // combos below since it takes no modifier.
      if (!mod && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setActiveTool("hand");
        setPlacingType(null);
        setSelectedElementIds([]);
        setEditingElementId(null);
        return;
      }
      if (
        e.key === "Escape" &&
        (activeTool === "hand" || activeTool === "connector" || activeTool === "pen" || activeTool === "eraser" || placingType)
      ) {
        e.preventDefault();
        setActiveTool("select");
        setPlacingType(null);
        return;
      }

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      // Connectors excluded — matches marquee-select just below, which also
      // only ever picks up positioned elements, never a connector by itself.
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedElementIds(positionedElements.map((el) => el.id));
        return;
      }

      // Single-letter tool shortcuts (V select / N sticky / R rectangle /
      // O ellipse / T text / A connector) — mirrors Miro/FigJam and, more
      // directly, offline-whiteboard's own scheme (see the reference repo
      // this was requested from). No modifier, so this must never fire
      // while one is held — mod combos above (Ctrl+A, Ctrl+D, ...) already
      // returned by this point if they matched, but e.g. Alt+N or a stray
      // Ctrl+something-else falling through must still be excluded.
      if (!mod && !e.altKey) {
        const letter = e.key.toLowerCase();
        if (letter === "v") {
          e.preventDefault();
          setActiveTool("select");
          setPlacingType(null);
          return;
        }
        if (letter === "n") {
          e.preventDefault();
          addElement("sticky");
          return;
        }
        if (letter === "r") {
          e.preventDefault();
          addElement("shape", "rectangle");
          return;
        }
        if (letter === "o") {
          e.preventDefault();
          addElement("shape", "ellipse");
          return;
        }
        if (letter === "t") {
          e.preventDefault();
          addElement("text");
          return;
        }
        if (letter === "a") {
          e.preventDefault();
          setActiveTool("connector");
          setPlacingType(null);
          return;
        }
        if (letter === "p") {
          e.preventDefault();
          setActiveTool("pen");
          setPlacingType(null);
          setSelectedElementIds([]);
          setEditingElementId(null);
          return;
        }
        if (letter === "e") {
          e.preventDefault();
          setActiveTool("eraser");
          setPlacingType(null);
          setSelectedElementIds([]);
          setEditingElementId(null);
          return;
        }
        if (letter === "[") {
          e.preventDefault();
          setPenSize((s) => Math.max(1, s - 2));
          return;
        }
        if (letter === "]") {
          e.preventDefault();
          setPenSize((s) => Math.min(40, s + 2));
          return;
        }
      }

      // Ctrl+V is deliberately NOT handled here. A keydown handler that
      // calls preventDefault() on Ctrl+V cancels the browser's default
      // paste action, which cancels the native "paste" ClipboardEvent too —
      // so handling it here would permanently shadow the OS-clipboard image
      // paste in the effect below (whichever handler runs would always win,
      // and this one runs first). The window "paste" listener below owns
      // all of Ctrl+V: OS clipboard image, then a pasted URL, then falling
      // back to the board's own internal copy/paste buffer.

      if (selectedElementIds.length === 0) return;

      if (e.key === "Tab") {
        e.preventDefault();
        addMindmapChild();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        addMindmapSibling();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        copySelected();
        deleteSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelected(0, -step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelected(0, step);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelected(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelected(step, 0);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementIds, elements, activeTool, placingType]);

  // Pasting a plain URL anywhere outside a text field drops a link-card at
  // the viewport center — no scraping/fetch, domain/title come straight
  // from the URL itself (see PropertyPanel's linkCard case for the same
  // domainOf logic, used when a URL is typed by hand instead). Pasting an
  // actual image (e.g. Win+Shift+S / PrintScreen straight from the OS
  // clipboard, or a copied image from another app/browser tab) instead
  // uploads it through the same endpoint PropertyPanel's image upload
  // button uses and drops a real, editable "image" element — same as
  // dragging in a file, minus the file picker.
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      if (isEditingText(e.target)) return;
      const items = e.clipboardData?.items;
      const imageItem = items && Array.from(items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
      const imageFile = imageItem?.getAsFile();
      if (imageFile) {
        e.preventDefault();
        setError(undefined);
        const result = await uploadWhiteboardFile("/api/admin/upload-whiteboard-image", imageFile);
        if (!result.url) {
          setError(result.error ?? "Tải ảnh lên thất bại.");
          return;
        }
        const naturalSize = await loadImageSize(result.url).catch(() => null);
        const scale = naturalSize ? Math.min(1, MAX_PASTED_IMAGE_DIM / Math.max(naturalSize.width, naturalSize.height)) : null;
        const size = naturalSize && scale ? { width: Math.round(naturalSize.width * scale), height: Math.round(naturalSize.height * scale) } : null;
        const v = viewportRef.current;
        const worldX = (window.innerWidth / 2 - 190 - v.x) / v.zoom;
        const worldY = (window.innerHeight / 2 - v.y) / v.zoom;
        const element = {
          ...createDefaultElement("image", crypto.randomUUID(), { x: worldX, y: worldY }),
          url: result.url,
          ...(size ?? {}),
        };
        commitElements((prev) => [...prev, element]);
        setSelectedElementIds([element.id]);
        return;
      }
      const text = e.clipboardData?.getData("text/plain")?.trim();
      let url: URL | null = null;
      if (text) {
        try {
          url = new URL(text);
        } catch {
          url = null;
        }
      }
      if (url && (url.protocol === "http:" || url.protocol === "https:")) {
        e.preventDefault();
        const v = viewportRef.current;
        const worldX = (window.innerWidth / 2 - 190 - v.x) / v.zoom;
        const worldY = (window.innerHeight / 2 - v.y) / v.zoom;
        const element = {
          ...createDefaultElement("linkCard", crypto.randomUUID(), { x: worldX, y: worldY }),
          url: text!,
          domain: url.hostname.replace(/^www\./, ""),
        };
        commitElements((prev) => [...prev, element]);
        setSelectedElementIds([element.id]);
        return;
      }
      // Nothing on the OS clipboard we can turn into an element (no image,
      // no URL) — fall back to the board's own internal copy/paste buffer
      // (whatever was last Ctrl+C'd inside the app), so Ctrl+V still does
      // something useful instead of silently no-oping. Safe to call
      // pasteClipboard/placeElementCopies from this effect's stale-ish
      // closure even though they're not in the dependency array below —
      // both only ever read clipboardRef.current (a ref) and call
      // commitElements/setSelectedElementIds (stable), never component
      // state directly.
      if (clipboardRef.current) {
        e.preventDefault();
        pasteClipboard();
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // pasteClipboard/placeElementCopies intentionally omitted — see the
    // comment above their call site for why re-subscribing on every render
    // isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitElements]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [exportMenuOpen]);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJSON() {
    const payload = { app: "kian-nguyen-whiteboard", version: 1, elements };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${boardTitle}.json`);
  }

  async function exportPNG() {
    if (positionedElements.length === 0) {
      setError("Bảng vẽ đang trống, không có gì để xuất.");
      return;
    }
    const node = document.querySelector<HTMLElement>("[data-whiteboard-surface]");
    if (!node) return;
    setError(undefined);
    // Frame everything and clear selection first — a PNG with a stray blue
    // selection outline or anchor dots baked in looks like a rendering bug,
    // not a feature. Both are prop-driven (not toggleable via html-to-image's
    // own clone-time overrides), so they're cleared on the real state and
    // restored after, with two rAFs to let the resulting re-render actually
    // paint before the DOM is read.
    const prevViewport = viewport;
    const prevSelection = selectedElementIds;
    // Fit against the surface node's OWN measured size, not the window
    // approximation fitToContent uses for its button — this is a pixel
    // capture, so a few pixels of drift between "window minus panel" and
    // the node's actual clientWidth/Height showed up as a cropped edge.
    setViewport(viewportToFit(positionedElements, node.clientWidth, node.clientHeight));
    setSelectedElementIds([]);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const res = await fetch(dataUrl);
      downloadBlob(await res.blob(), `${boardTitle}.png`);
    } catch {
      setError("Không thể xuất ảnh PNG — bảng vẽ có thể quá lớn, hoặc có ảnh/video không tải được.");
    } finally {
      setSelectedElementIds(prevSelection);
      setViewport(prevViewport);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file again still fires onChange
    if (!file) return;
    setError(undefined);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(await file.text());
    } catch {
      setError("File không phải JSON hợp lệ.");
      return;
    }
    // Accept both a bare elements array and the { elements: [...] } envelope
    // exportJSON above writes — either shape is a reasonable thing for
    // someone to hand-edit or generate.
    const candidate = parsedJson && typeof parsedJson === "object" && "elements" in parsedJson ? (parsedJson as { elements: unknown }).elements : parsedJson;
    const result = whiteboardElementsPayloadSchema.safeParse(candidate);
    if (!result.success) {
      setError("File JSON không đúng định dạng bảng vẽ.");
      return;
    }
    if (elements.length > 0) {
      const ok = await confirm({
        title: "Thay thế nội dung bảng vẽ?",
        description: "Toàn bộ nội dung hiện tại sẽ được thay bằng nội dung trong file đã chọn. Có thể Hoàn tác (Ctrl+Z) nếu đổi ý.",
        confirmLabel: "Thay thế",
        tone: "danger",
      });
      if (!ok) return;
    }
    const imported = result.data;
    commitElements(() => imported);
    setSelectedElementIds([]);
    setEditingElementId(null);
    const importedPositioned = imported.filter((el): el is PositionedWhiteboardElement => !isConnector(el));
    const availableWidth = window.innerWidth - (propertyPanelOpen ? PROPERTY_PANEL_PX : 0);
    setViewport(viewportToFit(importedPositioned, availableWidth, window.innerHeight));
  }

  function zoomBy(factor: number) {
    setViewport((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor)) }));
  }

  // Frames every element on the board, not a hardcoded jump to (0, 0) — an
  // empty board (or one whose content has drifted far from the origin, e.g.
  // after repeated "add centered on current viewport" drops) previously
  // looked identical to a board with nothing visible on screen.
  function fitToContent() {
    const availableWidth = window.innerWidth - (propertyPanelOpen ? PROPERTY_PANEL_PX : 0);
    setViewport(viewportToFit(positionedElements, availableWidth, window.innerHeight));
  }

  // Same confirm-then-replace pattern as handleImportFile above — clearing
  // is just importing an empty board. Still reversible with Ctrl+Z right
  // after (commitElements pushes the pre-clear state onto the undo stack
  // like any other change), but the confirm dialog exists because most
  // admins won't think to reach for undo after a full wipe.
  async function clearBoard() {
    if (elements.length === 0) return;
    const ok = await confirm({
      title: "Xóa toàn bộ bảng vẽ?",
      description: "Toàn bộ nội dung hiện tại sẽ bị xóa. Có thể Hoàn tác (Ctrl+Z) ngay sau đó nếu đổi ý.",
      confirmLabel: "Xóa hết",
      tone: "danger",
    });
    if (!ok) return;
    commitElements(() => []);
    setSelectedElementIds([]);
    setEditingElementId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <WhiteboardCanvas
            elements={elements}
            selectedElementIds={selectedElementIds}
            onSelectElementIds={setSelectedElementIds}
            onUpdateElement={updateElement}
            onUpdateElements={updateElements}
            onAddConnector={addConnector}
            onCreateDrawing={addDrawing}
            onEraseDrawings={eraseDrawings}
            penColor={penColor}
            penSize={penSize}
            viewport={viewport}
            onViewportChange={setViewport}
            tool={activeTool}
            placingType={placingType}
            onPlaceElementAt={placeElementAt}
            editingElementId={editingElementId}
            onStartEditing={setEditingElementId}
            onStopEditing={stopEditing}
            onDuplicateSelected={duplicateSelected}
            onDeleteSelected={deleteSelected}
            onConvertSelectedKind={convertSelectedKind}
            onCreateStickyAt={addStickyAt}
            commentThreads={commentThreads}
            onPlaceCommentThread={placeCommentThread}
            onReplyComment={replyToComment}
            onToggleCommentResolved={toggleCommentResolved}
            onMoveCommentAnchor={moveCommentAnchor}
          />

          {/* Floating chrome over the canvas (Miro-style) — a wrapper with
              pointer-events-none so empty space between the two rails still
              lets clicks/drags reach the canvas underneath; each rail
              re-enables pointer-events on itself. No admin header pills to
              clear above these anymore (admin-header.tsx renders nothing on
              this route), so they sit right at the top like the rest of the
              floating chrome. Autosave (the effect above, keyed off
              `isDirty`) doesn't read anything back from the UI, so it keeps
              running even with the "Đã lưu"/"Chưa lưu" status text removed
              from the title pill below — that was purely display, not part
              of the save trigger itself. */}
          <div className="pointer-events-none absolute inset-0">
            {/* left-20 (not left-4) — the sidebar's own collapse toggle
                (sidebar.tsx) is fixed-positioned right at this same edge, so
                a small offset here left them nearly touching. */}
            <div className="pointer-events-auto absolute left-20 top-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-1.5 pl-3 shadow-lg">
              <BackLink href={backHref}>Quay lại</BackLink>
              <span className="h-4 w-px bg-border" />
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleDraft}
                  disabled={renamePending}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={() => {
                    const trimmed = titleDraft.trim();
                    if (!trimmed || trimmed === boardTitle) {
                      setTitleDraft(boardTitle);
                      setEditingTitle(false);
                      return;
                    }
                    startRenameTransition(async () => {
                      await onRename(boardId, trimmed);
                      setBoardTitle(trimmed);
                      setEditingTitle(false);
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      setTitleDraft(boardTitle);
                      setEditingTitle(false);
                    }
                  }}
                  className="h-7 w-40 rounded border border-border bg-background px-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(boardTitle);
                    setEditingTitle(true);
                  }}
                  title="Sửa tên bảng vẽ"
                  className="group flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  {boardTitle}
                  <Pencil className="h-3 w-3 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}
              <PresenceAvatars users={presentUsers} />
            </div>
            {error && (
              <div className="pointer-events-auto absolute right-4 top-16 max-w-xs rounded-2xl border border-border bg-surface p-1.5 px-3 shadow-lg">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
            {/* Share sits in its own top-right pill (not the left title pill
                above) so it reads as a primary, easy-to-find action — same
                placement convention as most editors (Figma, Google Docs). */}
            {canManageSharing && (
              <div className="pointer-events-auto absolute right-20 top-4 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                <ShareDialog boardId={boardId} />
              </div>
            )}
            <div ref={exportMenuRef} className="pointer-events-auto absolute right-4 top-4">
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                title="Xuất / nhập bảng vẽ"
                aria-label="Xuất / nhập bảng vẽ"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-surface text-foreground shadow-lg transition-colors hover:border-primary-border-hover hover:text-primary"
              >
                <Download className="h-4 w-4" />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-12 w-52 space-y-0.5 rounded-xl border border-border bg-surface p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportPNG();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                  >
                    <ImageIcon className="h-4 w-4 text-muted" />
                    Xuất ảnh PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportJSON();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                  >
                    <FileJson className="h-4 w-4 text-muted" />
                    Xuất file JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      importFileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                  >
                    <Upload className="h-4 w-4 text-muted" />
                    Nhập file JSON
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      clearBoard();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-danger hover:bg-danger-bg"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa toàn bộ bảng vẽ
                  </button>
                </div>
              )}
              <input ref={importFileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
            </div>
            <div className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2">
              <ElementToolbar
                onAdd={startPlacing}
                placingType={placingType}
                onUndo={undo}
                canUndo={canUndo}
                onRedo={redo}
                canRedo={canRedo}
                activeTool={activeTool}
                onToolChange={(tool) => {
                  setActiveTool(tool);
                  setPlacingType(null);
                  if (tool === "hand" || tool === "pen" || tool === "eraser") {
                    setSelectedElementIds([]);
                    setEditingElementId(null);
                  }
                }}
                penColor={penColor}
                onPenColorChange={setPenColor}
                penSize={penSize}
                onPenSizeChange={setPenSize}
              />
            </div>
            {/* Sits at right-4 INSIDE the canvas's own flex-1 wrapper (not the
                page), so it automatically slides over to hug whichever edge
                is currently the canvas/panel boundary — browser's right edge
                when the panel is closed, right up against the panel's left
                border once it opens — with no manual position math needed. */}
            <button
              type="button"
              onClick={() => setPropertyPanelOpen((v) => !v)}
              title={propertyPanelOpen ? "Ẩn thanh thuộc tính" : "Hiện thanh thuộc tính"}
              aria-label={propertyPanelOpen ? "Ẩn thanh thuộc tính" : "Hiện thanh thuộc tính"}
              className="pointer-events-auto absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-border bg-surface text-foreground shadow-lg transition-colors hover:border-primary-border-hover hover:text-primary"
            >
              {propertyPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
            <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
              <button
                type="button"
                onClick={fitToContent}
                title="Canh vừa khung nhìn"
                aria-label="Canh vừa khung nhìn"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <Maximize className="h-4 w-4" />
              </button>
              <span className="mx-0.5 h-4 w-px bg-border" />
              <button type="button" onClick={() => zoomBy(0.8)} title="Thu nhỏ" aria-label="Thu nhỏ" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-11 text-center text-xs text-muted">{Math.round(viewport.zoom * 100)}%</span>
              <button type="button" onClick={() => zoomBy(1.25)} title="Phóng to" aria-label="Phóng to" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground">
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {propertyPanelOpen &&
          (selectedElementIds.length > 1 ? (
            <div className="w-72 shrink-0 space-y-3 border-l border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-foreground">{selectedElementIds.length} phần tử đã chọn</h2>
              <p className="text-xs text-muted">
                {selectedWholeGroupId()
                  ? "Đây là 1 nhóm — kéo, phóng to/thu nhỏ, xoay đều áp dụng cho cả nhóm."
                  : "Kéo bất kỳ phần tử nào để di chuyển cả nhóm. Phím mũi tên/Delete cũng áp dụng cho cả nhóm."}
              </p>
              <div className="flex gap-2">
                {selectedWholeGroupId() ? (
                  <Button type="button" variant="secondary" size="sm" onClick={ungroupSelected}>
                    <Ungroup className="h-3.5 w-3.5" />
                    Rã nhóm
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" size="sm" onClick={groupSelected}>
                    <GroupIcon className="h-3.5 w-3.5" />
                    Gộp nhóm
                  </Button>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={duplicateSelected}>
                  <Copy className="h-3.5 w-3.5" />
                  Nhân bản
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={deleteSelected}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </Button>
              </div>
            </div>
          ) : (
            <PropertyPanel
              selectedElement={selectedElement}
              onUpdateElement={(patch) => selectedElement && updateElement(selectedElement.id, patch)}
              onDeleteElement={deleteSelected}
              onDuplicateElement={duplicateSelected}
              onMoveElementLayer={(direction) => selectedElement && moveElementLayer(selectedElement.id, direction)}
            />
          ))}
      </div>
    </div>
  );
}
