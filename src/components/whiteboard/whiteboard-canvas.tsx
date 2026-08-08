"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import type { ConnectorAnchor, ConnectorElement, DrawingElement, PlaceableType, PositionedWhiteboardElement, ShapeKind, WhiteboardElement } from "@/lib/whiteboard-elements";
import { createDefaultElement, isConnector, hasInlineTextEditing } from "@/lib/whiteboard-elements";
import { getAnchorPoint, nearestEdgeAnchor, elementAtPoint, isPointNearDrawing } from "@/lib/whiteboard-geometry";
import { WhiteboardElementRenderer } from "@/components/whiteboard/whiteboard-element-renderer";
import { ConnectorLayer } from "./connector-layer";
import { ConnectorToolbar } from "./connector-toolbar";
import { SelectionToolbar } from "./selection-toolbar";
import type { WhiteboardTool } from "./element-toolbar";
import { CommentPins, DEFAULT_ANCHOR_U, DEFAULT_ANCHOR_V } from "./comment-pins";
import type { WhiteboardCommentThreadItem } from "@/lib/whiteboard-comment-actions";

export type Viewport = { x: number; y: number; zoom: number };

const SNAP_THRESHOLD = 6;
// Matches the range demonstrated against real Miro (roughly 1%–800%) rather
// than the narrower 15%–300% this started with — exported so the zoom
// pill's +/- buttons in whiteboard-editor.tsx clamp to the same limits
// instead of duplicating their own numbers.
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 8;
// One percentage point per wheel tick (see the ctrl+wheel handler below).
const ZOOM_STEP = 0.01;
const ANCHORS: Exclude<ConnectorAnchor, "center">[] = ["top", "right", "bottom", "left"];

type SnapGuides = { x: number | null; y: number | null };
type Marquee = { startX: number; startY: number; x: number; y: number } | null;
type Connecting = { sourceId: string; sourceAnchor: ConnectorAnchor; toWorld: { x: number; y: number } } | null;
type RotatingPreview = { id: string; rotation: number } | null;
type DrawingStroke = { x: number; y: number }[] | null;

type GroupResizeCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
type GroupMemberSnapshot = { id: string; x: number; y: number; width: number; height: number; rotation: number };
type GroupBox = { x: number; y: number; width: number; height: number };
// `groupId` is non-null only when every member shares one real saved group
// (see selectedGroup below) — purely informational, nothing here reads it
// back out, so an ad-hoc multi-select (no shared group) still gets the same
// combined resize/rotate box with `groupId: null`.
type SelectedGroup = { groupId: string | null; members: PositionedWhiteboardElement[]; box: GroupBox };
// A group resize/rotate gesture, captured once at mousedown (see
// startGroupResize/startGroupRotate) and read from a ref inside the window
// mousemove/mouseup listeners below — same "ref alongside state" pattern
// the single-element rotate drag above already uses, for the same reason
// (the listeners only re-subscribe when `groupGestureActive` flips, not on
// every mousemove tick, so a plain closure over state would go stale).
type GroupGesture =
  | { kind: "resize"; corner: GroupResizeCorner; groupBox: GroupBox; members: GroupMemberSnapshot[] }
  | { kind: "rotate"; centerWorld: { x: number; y: number }; centerScreen: { x: number; y: number }; startAngle: number; members: GroupMemberSnapshot[] };
type GroupTransformPreview = Map<string, { x: number; y: number; width: number; height: number; rotation: number }>;

function axisCandidates(others: PositionedWhiteboardElement[], axis: "x" | "y"): number[] {
  const values: number[] = [];
  for (const el of others) {
    const start = axis === "x" ? el.x : el.y;
    const dim = axis === "x" ? el.width : el.height;
    values.push(start, start + dim / 2, start + dim);
  }
  return values;
}

function snapAxis(rawStart: number, size: number, candidates: number[]): { value: number; guide: number | null } {
  for (const offset of [0, size / 2, size]) {
    const point = rawStart + offset;
    for (const candidate of candidates) {
      if (Math.abs(point - candidate) <= SNAP_THRESHOLD) {
        return { value: candidate - offset, guide: candidate };
      }
    }
  }
  return { value: rawStart, guide: null };
}

function snapResizeAxis(
  start: number,
  end: number,
  fixedEdge: "start" | "end",
  candidates: number[]
): { start: number; end: number; guide: number | null } {
  const movingPoint = fixedEdge === "start" ? end : start;
  for (const candidate of candidates) {
    if (Math.abs(movingPoint - candidate) <= SNAP_THRESHOLD) {
      return fixedEdge === "start" ? { start, end: candidate, guide: candidate } : { start: candidate, end, guide: candidate };
    }
  }
  return { start, end, guide: null };
}

function resizeFixedEdges(direction: string): { x: "start" | "end" | null; y: "start" | "end" | null } {
  const dir = direction.toLowerCase();
  return {
    x: dir.includes("left") ? "end" : dir.includes("right") ? "start" : null,
    y: dir.includes("top") ? "end" : dir.includes("bottom") ? "start" : null,
  };
}

// Small round handles at an element's 4 edge-midpoints, shown only while
// it's the sole selection — drag from one to another element's body to
// create a connector (see `connecting` state below); the anchor's own
// world-space point always matches getAnchorPoint, the same function
// connector-layer.tsx uses to draw the resulting line, so a connector can
// never visually disagree with where its anchor dot sits.
function AnchorDots({
  box,
  zoom,
  onStartConnect,
}: {
  box: { width: number; height: number };
  // Counter-scales the dot below so it stays a constant on-screen size
  // regardless of canvas zoom — see the comment further down for why.
  zoom: number;
  onStartConnect: (anchor: ConnectorAnchor, e: React.MouseEvent) => void;
}) {
  const positions: Record<Exclude<ConnectorAnchor, "center">, { left: string | number; top: string | number }> = {
    top: { left: "50%", top: 0 },
    right: { left: box.width, top: "50%" },
    bottom: { left: "50%", top: box.height },
    left: { left: 0, top: "50%" },
  };
  // This whole tree lives inside the world div's `scale(viewport.zoom)`
  // transform a few hundred lines up, so the 24px/14px sizes below — sized
  // for a 100%-zoom view — shrink right along with everything else once the
  // board is zoomed out. At e.g. 30% zoom a "24px" hit target is really only
  // ~7px on screen: too small to reliably land a click-drag on, so an
  // attempted connector-drag misses the dot and starts a canvas marquee
  // instead (grabbing the outer div's click, not the dot). Scaling the
  // visible+hit area by 1/zoom here cancels the ancestor's scale-down,
  // keeping a constant ~24px screen target at any zoom level — invisible at
  // 100% zoom (1/1 = no-op) and increasingly needed the further out you go.
  const inverseScale = 1 / zoom;
  return (
    <>
      {ANCHORS.map((anchor) => (
        // The outer div is a much bigger (24px) invisible hit target than
        // the dot actually painted (14px) — a bare 12px dot was genuinely
        // hard to land the cursor on, especially once the canvas is zoomed
        // out (this whole element lives inside the zoomed world div, so its
        // on-screen size shrinks along with everything else). Same "wide
        // invisible target around a thin visible thing" idea as the
        // connector hit-path in connector-layer.tsx.
        <div
          key={anchor}
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnect(anchor, e);
          }}
          className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-crosshair items-center justify-center"
          style={positions[anchor]}
        >
          {/* A separate inner div (not a transform merged onto the outer
              one) so this scale composes independently of the outer div's
              own translate(-50%,-50%) centering — an inline `transform`
              would otherwise replace, not combine with, that Tailwind
              utility's transform. Scaling around this inner box's own
              center keeps the anchor point stationary either way. */}
          <div className="flex h-6 w-6 items-center justify-center" style={{ transform: `scale(${inverseScale})` }}>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-primary bg-white" />
          </div>
        </div>
      ))}
    </>
  );
}

function RotateHandle({ onStart }: { onStart: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        onStart(e);
      }}
      className="absolute left-1/2 top-0 z-20 h-3 w-3 -translate-x-1/2 -translate-y-6 cursor-grab rounded-full border-2 border-primary bg-white"
      title="Xoay"
    />
  );
}

export function WhiteboardCanvas({
  elements,
  selectedElementIds,
  onSelectElementIds,
  onUpdateElement,
  onUpdateElements,
  onAddConnector,
  onCreateDrawing,
  onEraseDrawings,
  penColor,
  penSize,
  viewport,
  onViewportChange,
  tool,
  placingType,
  onPlaceElementAt,
  editingElementId,
  onStartEditing,
  onStopEditing,
  onDuplicateSelected,
  onDeleteSelected,
  onConvertSelectedKind,
  onCreateStickyAt,
  commentThreads,
  onPlaceCommentThread,
  onReplyComment,
  onToggleCommentResolved,
  onMoveCommentAnchor,
}: {
  elements: WhiteboardElement[];
  selectedElementIds: string[];
  onSelectElementIds: (ids: string[]) => void;
  onUpdateElement: (elementId: string, patch: Partial<WhiteboardElement>) => void;
  onUpdateElements: (patches: { id: string; patch: Partial<WhiteboardElement> }[]) => void;
  onAddConnector: (connector: ConnectorElement) => void;
  // Called once a freehand pen stroke finishes (mouseup with at least 2
  // points) — whiteboard-editor.tsx turns the raw world-space points into a
  // real "drawing" element and commits it, same undo-tracked path as every
  // other element creation.
  onCreateDrawing: (points: { x: number; y: number }[], color: string, strokeWidth: number) => void;
  // Called once a stroke-eraser drag ends, with every "drawing" element id
  // it passed over — batched into a single call (one undo step for the
  // whole drag), same as offline-sketch's own eraser batches its history.
  onEraseDrawings: (ids: string[]) => void;
  penColor: string;
  penSize: number;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  tool: WhiteboardTool;
  // Non-null while a toolbar placeable-type button is armed (see
  // whiteboard-editor.tsx's placingType) — the next click anywhere on the
  // canvas (even on top of an existing element, same as the pen/eraser
  // tools) calls onPlaceElementAt instead of doing this tool's normal
  // select/marquee/drag behavior. A dashed ghost box the size of that
  // type's default follows the cursor in the meantime.
  placingType: PlaceableType | null;
  onPlaceElementAt: (type: PlaceableType, worldX: number, worldY: number) => void;
  // Sticky notes support typing straight onto the canvas (double-click) as
  // an alternative to the property panel's "Nội dung" field — this is which
  // element (if any) currently has its inline <textarea> mounted. Lifted to
  // whiteboard-editor.tsx (not local state here) so addElement can also
  // trigger it the moment a brand-new sticky is dropped.
  editingElementId: string | null;
  onStartEditing: (elementId: string) => void;
  onStopEditing: () => void;
  // Backs the floating SelectionToolbar's duplicate/delete buttons — reuses
  // whiteboard-editor.tsx's own duplicateSelected/deleteSelected (valid to
  // call directly since the toolbar only ever renders while exactly one
  // element is selected).
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  // Backs the floating toolbar's "change shape" control (selection-toolbar.tsx) —
  // converts the single selected sticky/shape element to a different kind
  // in place (see convertTextElementKind in src/lib/whiteboard-elements.ts).
  onConvertSelectedKind: (target: "sticky" | ShapeKind) => void;
  // Double-clicking empty canvas (see the container's onDoubleClick below)
  // drops a new sticky centered on the click point — the world-space
  // coordinate is all this needs, whiteboard-editor.tsx owns actually
  // creating the element and opening it for editing.
  onCreateStickyAt: (worldX: number, worldY: number) => void;
  commentThreads: WhiteboardCommentThreadItem[];
  onPlaceCommentThread: (elementId: string, anchorU: number, anchorV: number, content: string) => void;
  onReplyComment: (threadId: string, content: string) => void;
  onToggleCommentResolved: (threadId: string, resolved: boolean) => void;
  onMoveCommentAnchor: (threadId: string, anchorU: number, anchorV: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Non-null while the SelectionToolbar's comment button has armed a
  // brand-new pin on that element — composer open, not saved yet. Local
  // state (not lifted to whiteboard-editor.tsx) since nothing outside this
  // component needs to know about it.
  const [composingCommentElementId, setComposingCommentElementId] = useState<string | null>(null);
  // Mirrored every render (not just on mount) so the wheel listener below
  // can read the truly-latest viewport/callback without re-subscribing on
  // every change — re-subscribing on each viewport update left a window
  // where a rapid run of wheel events (a fast physical scroll fires many in
  // quick succession) could read a stale `viewport` closure from before the
  // previous event's state update had committed, silently dropping steps.
  const onViewportChangeRef = useRef(onViewportChange);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);
  // Memoized on `elements` (not recomputed on every render) — otherwise a
  // pan or zoom tick, which changes `viewport` but not `elements`, still
  // rebuilt these arrays/Map from scratch every mousemove for no reason.
  const positioned = useMemo(() => elements.filter((el): el is PositionedWhiteboardElement => !isConnector(el)), [elements]);
  const connectors = useMemo(() => elements.filter(isConnector), [elements]);
  const elementsById = useMemo(() => new Map(positioned.map((el) => [el.id, el])), [positioned]);

  // Non-null for ANY 2+ selection — a saved group (Ctrl+G) and a plain
  // ad-hoc marquee/shift-click multi-select both get the same combined
  // bounding-box overlay (resize corners + rotate handle) further down;
  // moving multiple elements together already worked for both cases
  // (isGroupDrag below), this just extends resize/rotate to match. Real
  // saved groups always show up here with every member already included —
  // clicking or marqueeing any one member auto-expands the selection to the
  // whole group (see the marquee hit-test and Rnd onMouseDown below) — so
  // there's no "partial slice of a group" case to special-case separately
  // from a plain multi-select.
  const selectedGroup: SelectedGroup | null = useMemo(() => {
    if (selectedElementIds.length < 2) return null;
    const selectedSet = new Set(selectedElementIds);
    const members = positioned.filter((el) => selectedSet.has(el.id));
    if (members.length < 2) return null;
    const minX = Math.min(...members.map((el) => el.x));
    const minY = Math.min(...members.map((el) => el.y));
    const maxX = Math.max(...members.map((el) => el.x + el.width));
    const maxY = Math.max(...members.map((el) => el.y + el.height));
    const firstGroupId = elementsById.get(selectedElementIds[0])?.groupId ?? null;
    const groupId = firstGroupId && members.every((el) => el.groupId === firstGroupId) ? firstGroupId : null;
    return { groupId, members, box: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
  }, [selectedElementIds, positioned, elementsById]);

  // Tracks the canvas container's actual on-screen size (via ResizeObserver,
  // not a one-time read) so the culling below stays correct if the window or
  // the property panel's open/closed state resizes it.
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Elements whose box doesn't intersect the visible viewport (plus a
  // screen-space margin, so nothing pops in/out right at the edge) are
  // skipped from RENDERING only — every other use of `positioned` below
  // (marquee hit-testing, snap candidates, connector auto-attach) still
  // reads the full array, since those need to see off-screen elements too.
  // Falls back to rendering everything until the first ResizeObserver
  // measurement lands (containerSize starts at 0×0).
  const CULL_MARGIN_PX = 400;
  const visibleWorldBounds =
    containerSize.width > 0
      ? {
          left: (-viewport.x - CULL_MARGIN_PX) / viewport.zoom,
          top: (-viewport.y - CULL_MARGIN_PX) / viewport.zoom,
          right: (containerSize.width - viewport.x + CULL_MARGIN_PX) / viewport.zoom,
          bottom: (containerSize.height - viewport.y + CULL_MARGIN_PX) / viewport.zoom,
        }
      : null;
  const visiblePositioned = visibleWorldBounds
    ? positioned.filter(
        (el) =>
          selectedElementIds.includes(el.id) ||
          (el.x + el.width >= visibleWorldBounds.left &&
            el.x <= visibleWorldBounds.right &&
            el.y + el.height >= visibleWorldBounds.top &&
            el.y <= visibleWorldBounds.bottom)
      )
    : positioned;
  const visiblePositionedIds = visibleWorldBounds ? new Set(visiblePositioned.map((el) => el.id)) : null;
  const visibleConnectors =
    visiblePositionedIds != null
      ? connectors.filter(
          (c) => selectedElementIds.includes(c.id) || visiblePositionedIds.has(c.sourceId) || visiblePositionedIds.has(c.targetId)
        )
      : connectors;

  // Precomputed once per drag/resize GESTURE (in the matching *Start
  // handler below), not rebuilt on every mousemove tick — snapping against
  // "every other element's edges/midpoints" is the same candidate list for
  // the whole gesture (nothing else on the board moves while you're
  // dragging one thing), so recomputing it on each of dozens of mousemove
  // events per second was pure waste that got worse the bigger the board.
  const dragCandidatesRef = useRef<{ x: number[]; y: number[] } | null>(null);

  const [groupDragDelta, setGroupDragDelta] = useState<{ dx: number; dy: number } | null>(null);
  // Live (not-yet-committed) box for whichever SINGLE element is currently
  // being dragged or resized — element.x/y/width/height itself only updates
  // on drag/resize STOP, so without this, any connector attached to the
  // element being moved stayed frozen at its pre-drag position for the
  // whole gesture and only visually snapped once the drag ended. Combined
  // with groupDragDelta/groupTransformPreview below (which already track
  // the group cases) into `connectorLiveOverrides`, handed to ConnectorLayer
  // so a connector's anchor always reflects whatever's actually on screen
  // right now, not the last committed state.
  const [singleLivePreview, setSingleLivePreview] = useState<{ id: string; x: number; y: number; width: number; height: number } | null>(
    null
  );
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({ x: null, y: null });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  // Hides the floating SelectionToolbar while an element is actively being
  // dragged — the toolbar's position is computed from element.x/y, which
  // (per onDragStop below) only commits to state once the drag ends, so a
  // visible toolbar during the drag itself would sit frozen at the
  // pre-drag position while the element visually moves away from it.
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  // Character offsets of the current text selection inside the standalone
  // Text element's inline edit <textarea> below — lifted up here (rather
  // than read on-demand via a ref) so SelectionToolbar's link button can
  // reactively enable/disable itself as the selection changes. Reset
  // whenever editing moves to a different element (or stops) via the
  // "adjust state during render" pattern below, the same one
  // whiteboard-element-renderer.tsx's YoutubeEmbed uses for a similar
  // reset-on-prop-change need — cheaper than an effect for this case.
  const [editingSelection, setEditingSelection] = useState<{ start: number; end: number } | null>(null);
  const [prevEditingElementId, setPrevEditingElementId] = useState(editingElementId);
  if (editingElementId !== prevEditingElementId) {
    setPrevEditingElementId(editingElementId);
    setEditingSelection(null);
  }
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [connecting, setConnecting] = useState<Connecting>(null);
  // In-progress pen stroke (world-space points) — null whenever the pen
  // tool isn't mid-drag. Rendered as a live SVG preview inside the
  // world-transformed div below so it pans/zooms with everything else at
  // no extra cost, then handed to onCreateDrawing on mouseup.
  const [drawingStroke, setDrawingStroke] = useState<DrawingStroke>(null);
  // World-space cursor position while placingType is armed — null until the
  // first mousemove over the canvas after arming, so the ghost preview only
  // appears once there's a real point to show it at. Reset to null whenever
  // placingType itself goes back to null (armed → disarmed via Escape,
  // another tool, or a completed placement).
  const [placingCursorWorld, setPlacingCursorWorld] = useState<{ x: number; y: number } | null>(null);
  // "Adjust state during render" (same pattern as prevEditingElementId
  // above) rather than an effect — this only needs to run on the render
  // where placingType itself changes, not as a reaction to some external
  // system.
  const [prevPlacingType, setPrevPlacingType] = useState(placingType);
  if (placingType !== prevPlacingType) {
    setPrevPlacingType(placingType);
    if (!placingType) setPlacingCursorWorld(null);
  }
  // Default size for whichever type is armed, used to size/center the ghost
  // preview box — read off createDefaultElement (dummy id/position, only
  // width/height matter here) so it can't drift out of sync with the real
  // element's own default size.
  const placingGhostSize = useMemo(
    () => (placingType ? createDefaultElement(placingType, "placing-preview", { x: 0, y: 0 }) : null),
    [placingType]
  );
  const erasingRef = useRef(false);
  // Ids erased so far during the CURRENT eraser drag — filtered out of
  // rendering immediately (so erasing feels instant) but only reported to
  // onEraseDrawings on mouseup, batching the whole drag into one undo step.
  const [erasedDuringDrag, setErasedDuringDrag] = useState<Set<string>>(new Set());
  const [rotatingPreview, setRotatingPreview] = useState<RotatingPreview>(null);
  const rotateStartRef = useRef<{ id: string; centerX: number; centerY: number; startAngle: number; startRotation: number } | null>(null);
  const latestRotationRef = useRef<RotatingPreview>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStateRef = useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  // Group resize/rotate gesture — see the GroupGesture type's own comment.
  const groupGestureRef = useRef<GroupGesture | null>(null);
  const [groupGestureActive, setGroupGestureActive] = useState(false);
  const [groupTransformPreview, setGroupTransformPreview] = useState<GroupTransformPreview | null>(null);
  const groupTransformPreviewRef = useRef<GroupTransformPreview | null>(null);

  function toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }

  // Space bar toggles pan mode (like Miro/Figma) — tracked on window so it
  // works regardless of which element currently has focus.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isEditingTextTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    // Non-text <input> types (the pen tool's own brush-size range slider,
    // in particular) don't count as "editing text" — see whiteboard-editor.tsx's
    // own isEditingText for the matching fix and the bug this avoids.
    function isEditingTextTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === "TEXTAREA" || el.isContentEditable) return true;
      if (el.tagName === "INPUT") {
        const type = (el as HTMLInputElement).type;
        return type !== "range" && type !== "color" && type !== "checkbox" && type !== "radio";
      }
      return false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Escape backs out of whatever multi-step gesture is currently in
  // progress — a connector being dragged out (from an anchor dot or the
  // arrow tool), a rotation, or a marquee-select box — without applying it.
  // Re-subscribes on every change to these three (rather than reading them
  // through a ref like the wheel handler does) since they only ever change
  // a few times per gesture, nowhere near the wheel handler's per-tick
  // frequency that made a ref necessary there.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (groupGestureActive) {
        groupGestureRef.current = null;
        groupTransformPreviewRef.current = null;
        setGroupTransformPreview(null);
        setGroupGestureActive(false);
        return;
      }
      if (connecting) {
        setConnecting(null);
        return;
      }
      if (rotatingPreview) {
        rotateStartRef.current = null;
        latestRotationRef.current = null;
        setRotatingPreview(null);
        return;
      }
      if (marquee) setMarquee(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [connecting, rotatingPreview, marquee, groupGestureActive]);

  // Global listeners while a connector is being dragged out — the drag
  // routinely leaves the source element's own box, so per-element handlers
  // alone can't track it.
  useEffect(() => {
    if (!connecting) return;
    // Captured as primitives (not `connecting` itself) so TS's null-check
    // above stays valid inside the nested onUp closure below.
    const sourceId = connecting.sourceId;
    const sourceAnchor = connecting.sourceAnchor;
    function onMove(e: MouseEvent) {
      setConnecting((prev) => (prev ? { ...prev, toWorld: toWorld(e.clientX, e.clientY) } : prev));
    }
    function onUp(e: MouseEvent) {
      // Reads sourceId/sourceAnchor from this effect's own closure (stable
      // for the whole drag — the effect only re-runs when sourceId changes)
      // rather than through setConnecting's updater — calling onAddConnector
      // (which bubbles up to WhiteboardEditor's setState) from inside
      // another component's state updater trips React's "Cannot update a
      // component while rendering a different component" warning, since
      // updaters are expected to be pure.
      const point = toWorld(e.clientX, e.clientY);
      const target = elementAtPoint(
        positioned.filter((el) => el.id !== sourceId),
        point
      );
      if (target) {
        onAddConnector({
          id: crypto.randomUUID(),
          type: "connector",
          zIndex: 0,
          sourceId,
          sourceAnchor,
          targetId: target.id,
          targetAnchor: nearestEdgeAnchor(target, point),
          stroke: "#64748b",
          strokeWidth: 2,
          arrowStart: false,
          arrowEnd: true,
          kind: "curved",
          dash: "solid",
        });
      }
      setConnecting(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting?.sourceId]);

  // Global listeners while rotating — same reasoning as the connector drag
  // above (the cursor routinely leaves the element's own box).
  useEffect(() => {
    const rotating = rotatingPreview;
    if (!rotating) return;
    function onMove(e: MouseEvent) {
      const start = rotateStartRef.current;
      if (!start) return;
      const angle = (Math.atan2(e.clientY - start.centerY, e.clientX - start.centerX) * 180) / Math.PI;
      const rotation = Math.round(start.startRotation + (angle - start.startAngle));
      // Mirrored into a ref alongside the state update — onUp needs the
      // LATEST rotation (this effect only re-subscribes when the rotating
      // element's id changes, not on every degree of movement, so its own
      // closure over `rotating` would otherwise be stale). Committing via
      // onUpdateElement inside setRotatingPreview's updater (the more
      // obvious approach) trips React's "Cannot update a component while
      // rendering a different component" warning, same as the connector
      // drag's onUp above.
      latestRotationRef.current = { id: start.id, rotation };
      setRotatingPreview({ id: start.id, rotation });
    }
    function onUp() {
      const start = rotateStartRef.current;
      const latest = latestRotationRef.current;
      if (start && latest) onUpdateElement(start.id, { rotation: latest.rotation });
      rotateStartRef.current = null;
      latestRotationRef.current = null;
      setRotatingPreview(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotatingPreview?.id]);

  // Global listeners while a group resize/rotate is in progress — mirrors
  // the connector-drag/rotate effects above (the cursor routinely leaves
  // the group's own bounding box). Resize scales every member's box
  // proportionally from whichever corner is opposite the one being dragged;
  // rotate spins the whole rigid group around its own bbox center (each
  // member orbits the center AND spins its own `rotation` by the same
  // delta, which is the standard "rotate a group of shapes together" math).
  useEffect(() => {
    if (!groupGestureActive) return;
    function onMove(e: MouseEvent) {
      const g = groupGestureRef.current;
      if (!g) return;
      const preview: GroupTransformPreview = new Map();
      if (g.kind === "resize") {
        const world = toWorld(e.clientX, e.clientY);
        const MIN_SIZE = 20;
        const fixedX = g.corner === "topLeft" || g.corner === "bottomLeft" ? g.groupBox.x + g.groupBox.width : g.groupBox.x;
        const fixedY = g.corner === "topLeft" || g.corner === "topRight" ? g.groupBox.y + g.groupBox.height : g.groupBox.y;
        const newWidth = Math.max(MIN_SIZE, Math.abs(world.x - fixedX));
        const newHeight = Math.max(MIN_SIZE, Math.abs(world.y - fixedY));
        const newX = Math.min(fixedX, world.x);
        const newY = Math.min(fixedY, world.y);
        const scaleX = newWidth / g.groupBox.width;
        const scaleY = newHeight / g.groupBox.height;
        for (const m of g.members) {
          preview.set(m.id, {
            x: newX + (m.x - g.groupBox.x) * scaleX,
            y: newY + (m.y - g.groupBox.y) * scaleY,
            width: m.width * scaleX,
            height: m.height * scaleY,
            rotation: m.rotation,
          });
        }
      } else {
        const currentAngle = (Math.atan2(e.clientY - g.centerScreen.y, e.clientX - g.centerScreen.x) * 180) / Math.PI;
        const delta = currentAngle - g.startAngle;
        const rad = (delta * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        for (const m of g.members) {
          const centerX = m.x + m.width / 2;
          const centerY = m.y + m.height / 2;
          const relX = centerX - g.centerWorld.x;
          const relY = centerY - g.centerWorld.y;
          const newCenterX = g.centerWorld.x + (relX * cos - relY * sin);
          const newCenterY = g.centerWorld.y + (relX * sin + relY * cos);
          preview.set(m.id, { x: newCenterX - m.width / 2, y: newCenterY - m.height / 2, width: m.width, height: m.height, rotation: m.rotation + delta });
        }
      }
      groupTransformPreviewRef.current = preview;
      setGroupTransformPreview(preview);
    }
    function onUp() {
      const preview = groupTransformPreviewRef.current;
      if (preview && preview.size > 0) {
        onUpdateElements([...preview.entries()].map(([id, p]) => ({ id, patch: { x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation } })));
      }
      groupGestureRef.current = null;
      groupTransformPreviewRef.current = null;
      setGroupTransformPreview(null);
      setGroupGestureActive(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupGestureActive]);

  function startGroupResize(corner: GroupResizeCorner, group: SelectedGroup) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      groupGestureRef.current = {
        kind: "resize",
        corner,
        groupBox: group.box,
        members: group.members.map((el) => ({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation })),
      };
      setGroupGestureActive(true);
    };
  }

  function startGroupRotate(group: SelectedGroup) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const centerWorld = { x: group.box.x + group.box.width / 2, y: group.box.y + group.box.height / 2 };
      const rect = containerRef.current!.getBoundingClientRect();
      const centerScreen = { x: rect.left + viewport.x + centerWorld.x * viewport.zoom, y: rect.top + viewport.y + centerWorld.y * viewport.zoom };
      const startAngle = (Math.atan2(e.clientY - centerScreen.y, e.clientX - centerScreen.x) * 180) / Math.PI;
      groupGestureRef.current = {
        kind: "rotate",
        centerWorld,
        centerScreen,
        startAngle,
        members: group.members.map((el) => ({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation })),
      };
      setGroupGestureActive(true);
    };
  }

  // Recomputes the group's own bounding box from whatever the live resize/
  // rotate preview currently says (falling back to committed member
  // positions for any member not yet in the preview map) — so the overlay
  // itself tracks the gesture in real time instead of staying frozen at the
  // pre-gesture box.
  function liveGroupBox(group: SelectedGroup): GroupBox {
    if (!groupTransformPreview) return group.box;
    const lefts = group.members.map((m) => groupTransformPreview.get(m.id)?.x ?? m.x);
    const tops = group.members.map((m) => groupTransformPreview.get(m.id)?.y ?? m.y);
    const rights = group.members.map((m) => {
      const p = groupTransformPreview.get(m.id);
      return (p?.x ?? m.x) + (p?.width ?? m.width);
    });
    const bottoms = group.members.map((m) => {
      const p = groupTransformPreview.get(m.id);
      return (p?.y ?? m.y) + (p?.height ?? m.height);
    });
    const minX = Math.min(...lefts);
    const minY = Math.min(...tops);
    const maxX = Math.max(...rights);
    const maxY = Math.max(...bottoms);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  // Deletes at most one "drawing" element per call — the topmost (highest
  // zIndex) one whose actual ink the point lands near, never a sticky/shape/
  // image/etc. A continuing drag calls this again on every subsequent
  // mousemove (see onMouseMove below), so a real erase gesture still catches
  // every stroke it passes over one at a time, matching offline-sketch's own
  // "tap a line to delete it whole" model rather than a blunt bbox wipe.
  function tryErase(point: { x: number; y: number }) {
    const candidates = positioned
      .filter((el): el is DrawingElement => el.type === "drawing" && !erasedDuringDrag.has(el.id))
      .sort((a, b) => b.zIndex - a.zIndex);
    for (const el of candidates) {
      if (isPointNearDrawing(el, point, viewport.zoom)) {
        setErasedDuringDrag((prev) => new Set(prev).add(el.id));
        return;
      }
    }
  }

  function selectOnMouseDown(id: string, additive: boolean) {
    if (additive) {
      onSelectElementIds(selectedElementIds.includes(id) ? selectedElementIds.filter((s) => s !== id) : [...selectedElementIds, id]);
      return;
    }
    if (selectedElementIds.includes(id) && selectedElementIds.length > 1) return;
    onSelectElementIds([id]);
  }

  // A plain React onWheel prop can't reliably block the browser's own
  // ctrl+scroll/pinch page-zoom: React 17+ registers wheel listeners as
  // passive by default (for scroll perf), so e.preventDefault() inside a
  // synthetic handler is silently ignored — the canvas zoomed correctly but
  // Chrome zoomed the whole page along with it. A real addEventListener with
  // { passive: false } is the only way to actually suppress the native
  // zoom/scroll for this gesture.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheelNative(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el!.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        // A flat +/-1 percentage point per wheel tick — deliberately NOT
        // scaled by the raw e.deltaY. deltaY's magnitude for one physical
        // scroll "click" varies wildly across mice/trackpads/browsers
        // (anywhere from ~3 to 300+); the old `zoom * (1 - deltaY * 0.01)`
        // formula could go negative for a single large-deltaY tick, which
        // then clamped straight down to MIN_ZOOM — one scroll-out jumped
        // from 800% to 2%. Only the sign of deltaY matters here, so the
        // step size is always predictable regardless of input device.
        const direction = e.deltaY > 0 ? -1 : e.deltaY < 0 ? 1 : 0;
        // A functional update, not a value computed from the `viewport`
        // prop — a fast burst of wheel events (a hard fling, or a high
        // polling-rate mouse) can fire several ticks before React commits
        // the previous one; reading `viewport` in the closure would then
        // compute every tick in the burst off the same stale zoom and only
        // apply the last one, silently dropping steps. The updater form
        // always sees whatever the pending state actually is.
        onViewportChangeRef.current((prev) => {
          const worldX = (cursorX - prev.x) / prev.zoom;
          const worldY = (cursorY - prev.y) / prev.zoom;
          const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + direction * ZOOM_STEP));
          return { zoom: nextZoom, x: cursorX - worldX * nextZoom, y: cursorY - worldY * nextZoom };
        });
        return;
      }
      onViewportChangeRef.current((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY, zoom: prev.zoom }));
    }
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, []);

  // Merges every in-progress "not yet committed" box this file tracks
  // (single drag/resize, group drag, group resize/rotate) into one lookup
  // ConnectorLayer can check per endpoint — a connector attached to
  // whichever element(s) are actively moving right now should follow along
  // in real time instead of waiting for the gesture to end and the real
  // commit to land.
  const connectorLiveOverrides: Map<string, { x: number; y: number; width: number; height: number }> | null = (() => {
    if (groupTransformPreview) return groupTransformPreview;
    if (groupDragDelta) {
      const map = new Map<string, { x: number; y: number; width: number; height: number }>();
      for (const id of selectedElementIds) {
        const el = elementsById.get(id);
        if (el) map.set(id, { x: el.x + groupDragDelta.dx, y: el.y + groupDragDelta.dy, width: el.width, height: el.height });
      }
      return map;
    }
    if (singleLivePreview) return new Map([[singleLivePreview.id, singleLivePreview]]);
    return null;
  })();

  return (
    <div
      ref={containerRef}
      // Stable hook for whiteboard-editor.tsx's PNG export — it snapshots
      // this whole node (connector SVG + transformed elements div together)
      // rather than either layer alone, since connectors are drawn in
      // screen-space off the live viewport and have no world-space
      // coordinates of their own to align a tighter crop to.
      data-whiteboard-surface
      className={`relative h-full w-full overflow-hidden bg-white ${
        isPanning
          ? "cursor-grabbing"
          : spaceHeld || tool === "hand"
            ? "cursor-grab"
            : tool === "connector" || tool === "pen" || placingType
              ? "cursor-crosshair"
              : tool === "eraser"
                ? "cursor-cell"
                : ""
      }`}
      onMouseDown={(e) => {
        if (e.button === 1 || (e.button === 0 && (spaceHeld || tool === "hand"))) {
          e.preventDefault();
          panStateRef.current = { startClientX: e.clientX, startClientY: e.clientY, startPanX: viewport.x, startPanY: viewport.y };
          setIsPanning(true);
          return;
        }
        // Click-to-place anywhere — including on top of an existing
        // element, same "fire before the empty-canvas check" reasoning as
        // pen/eraser just below — a click while a toolbar type is armed
        // should always drop the new element right there.
        if (placingType) {
          e.preventDefault();
          const world = toWorld(e.clientX, e.clientY);
          onPlaceElementAt(placingType, world.x, world.y);
          return;
        }
        // Pen/eraser draw or erase anywhere on the canvas — including
        // straight over another element's box — so this must fire before
        // the "did this land on empty canvas" check just below (which
        // exists only for starting a marquee-select).
        if (tool === "pen") {
          e.preventDefault();
          setDrawingStroke([toWorld(e.clientX, e.clientY)]);
          return;
        }
        if (tool === "eraser") {
          e.preventDefault();
          erasingRef.current = true;
          tryErase(toWorld(e.clientX, e.clientY));
          return;
        }
        // The arrow tool only ever starts a connection FROM an element's own
        // body (handled by that element's Rnd onMouseDown below, which
        // stopPropagation()s before this ever runs) — an empty-canvas click
        // while this tool is active has nothing to do, same as
        // offline-whiteboard's own arrow tool leaves empty-space clicks a
        // no-op rather than starting a marquee that could never complete a
        // connection anyway.
        if (tool === "connector") return;
        const target = e.target as HTMLElement;
        if (e.target !== e.currentTarget && target.dataset?.canvasBg === undefined) return;
        const world = toWorld(e.clientX, e.clientY);
        setMarquee({ startX: world.x, startY: world.y, x: world.x, y: world.y });
        if (!e.shiftKey) onSelectElementIds([]);
      }}
      onMouseMove={(e) => {
        if (panStateRef.current) {
          const start = panStateRef.current;
          onViewportChange({ ...viewport, x: start.startPanX + (e.clientX - start.startClientX), y: start.startPanY + (e.clientY - start.startClientY) });
          return;
        }
        if (placingType) {
          setPlacingCursorWorld(toWorld(e.clientX, e.clientY));
          return;
        }
        if (drawingStroke) {
          const world = toWorld(e.clientX, e.clientY);
          const last = drawingStroke[drawingStroke.length - 1];
          // Skips near-duplicate points a fast drag would otherwise pile up
          // (screen-space mousemove ticks, not stylus samples — nothing here
          // needs pressure/coalesced-event fidelity) — keeps the points
          // array a reasonable size without any visible loss of smoothness.
          if (!last || Math.hypot(world.x - last.x, world.y - last.y) > 0.75) {
            setDrawingStroke([...drawingStroke, world]);
          }
          return;
        }
        if (erasingRef.current) {
          tryErase(toWorld(e.clientX, e.clientY));
          return;
        }
        if (!marquee) return;
        const world = toWorld(e.clientX, e.clientY);
        setMarquee({ ...marquee, x: world.x, y: world.y });
      }}
      onMouseUp={(e) => {
        if (panStateRef.current) {
          panStateRef.current = null;
          setIsPanning(false);
          return;
        }
        if (drawingStroke) {
          // A plain click with no real drag leaves exactly 1 point —
          // discarded rather than creating an invisible zero-length
          // element, same "don't keep an accidental no-op" convention as
          // stopEditing dropping a never-typed-into Text element.
          if (drawingStroke.length >= 2) onCreateDrawing(drawingStroke, penColor, penSize);
          setDrawingStroke(null);
          return;
        }
        if (erasingRef.current) {
          erasingRef.current = false;
          if (erasedDuringDrag.size > 0) {
            onEraseDrawings([...erasedDuringDrag]);
            setErasedDuringDrag(new Set());
          }
          return;
        }
        if (!marquee) return;
        const left = Math.min(marquee.startX, marquee.x);
        const top = Math.min(marquee.startY, marquee.y);
        const right = Math.max(marquee.startX, marquee.x);
        const bottom = Math.max(marquee.startY, marquee.y);
        const rawHit = positioned.filter((el) => el.x < right && el.x + el.width > left && el.y < bottom && el.y + el.height > top);
        // Catching even one member of a saved group pulls in every sibling
        // (same "group behaves as one object" rule the click handler below
        // enforces) — otherwise a marquee box that only grazed part of a
        // group would leave it half-selected.
        const expandedHit = new Set(rawHit.map((el) => el.id));
        for (const el of rawHit) {
          if (!el.groupId) continue;
          for (const sibling of positioned) {
            if (sibling.groupId === el.groupId) expandedHit.add(sibling.id);
          }
        }
        const hit = [...expandedHit];
        if (hit.length > 0) {
          onSelectElementIds(e.shiftKey ? [...new Set([...selectedElementIds, ...hit])] : hit);
        }
        setMarquee(null);
      }}
      onDoubleClick={(e) => {
        // Same "did this land on empty canvas, not a child element" check
        // the mousedown handler above already uses for starting a marquee —
        // double-clicking an existing element is handled by that element's
        // OWN onDoubleClick (edit its text), which never reaches here.
        if (tool !== "select" || placingType) return;
        const target = e.target as HTMLElement;
        if (e.target !== e.currentTarget && target.dataset?.canvasBg === undefined) return;
        const world = toWorld(e.clientX, e.clientY);
        onCreateStickyAt(world.x, world.y);
      }}
    >
      {/* Rendered BEFORE the elements layer below (not after) so that
          elements — and especially their AnchorDots, which sit exactly at
          a connector's own endpoint — always win pointer-event hit-testing
          over a connector's invisible hit-path. Both are position:absolute
          siblings with no explicit z-index, so paint order follows DOM
          order; with this SVG first, a second/third connector dragged from
          the same anchor point no longer has its mousedown swallowed by an
          already-drawn connector's hit-path lying on top of that anchor. */}
      <ConnectorLayer
        connectors={visibleConnectors}
        elementsById={elementsById}
        liveOverrides={connectorLiveOverrides}
        viewport={viewport}
        selectedElementIds={selectedElementIds}
        onSelectConnector={(id, additive) => selectOnMouseDown(id, additive)}
        interactive={tool === "select"}
      />
      <div
        data-canvas-bg
        className="absolute left-0 top-0"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "0 0" }}
      >
        {visiblePositioned.filter((element) => !erasedDuringDrag.has(element.id)).map((element) => {
          const isSelected = selectedElementIds.includes(element.id);
          const inGroupDrag = isSelected && selectedElementIds.length > 1 && groupDragDelta !== null;
          const offsetX = inGroupDrag ? groupDragDelta!.dx : 0;
          const offsetY = inGroupDrag ? groupDragDelta!.dy : 0;
          // Live override from an in-progress group resize/rotate gesture —
          // falls back to the element's own committed x/y/width/height/
          // rotation, same "preview until the gesture ends" idea as
          // groupDragDelta above and rotatingPreview below.
          const groupPreview = groupTransformPreview?.get(element.id);
          const renderX = (groupPreview?.x ?? element.x) + offsetX;
          const renderY = (groupPreview?.y ?? element.y) + offsetY;
          const renderWidth = groupPreview?.width ?? element.width;
          const renderHeight = groupPreview?.height ?? element.height;
          const rotation = rotatingPreview?.id === element.id ? rotatingPreview.rotation : (groupPreview?.rotation ?? element.rotation);
          const isEditingThis = editingElementId === element.id;
          return (
            <Rnd
              key={element.id}
              size={{ width: renderWidth, height: renderHeight }}
              position={{ x: renderX, y: renderY }}
              scale={viewport.zoom}
              disableDragging={
                tool === "hand" || tool === "connector" || tool === "pen" || tool === "eraser" || !!placingType || isEditingThis || groupGestureActive
              }
              // While a whole saved group is the active selection, the
              // GROUP's own bounding-box corner handles (rendered further
              // down) are the only way to resize — an individual member's
              // own (otherwise always-present) resize handles would let you
              // resize just that one member "through" the group selection,
              // which contradicts "the group behaves as one object."
              enableResizing={selectedGroup ? false : undefined}
              style={{
                zIndex: element.zIndex,
                outline: isSelected && !selectedGroup ? "2px solid var(--primary)" : "none",
                cursor:
                  placingType
                    ? "crosshair"
                    : tool === "hand"
                      ? "grab"
                      : tool === "connector" || tool === "pen"
                        ? "crosshair"
                        : tool === "eraser"
                          ? "cell"
                          : undefined,
              }}
              onMouseDown={(e) => {
                // Same reasoning as the pen/eraser carve-out just below — a
                // click-to-place needs to land even when the cursor happens
                // to be over an existing element's box, so this must let the
                // mousedown bubble up to the container's own onPlaceElementAt
                // handler rather than selecting/dragging this element.
                if (placingType) return;
                // While the hand tool is active, deliberately does NOT
                // stopPropagation/select — letting the mousedown bubble up
                // lets the container's own handler start a pan instead, so
                // dragging over an element pans the whole board rather than
                // moving just that element (disableDragging above also
                // blocks react-rnd's own drag-start for the same reason).
                if (tool === "hand") return;
                // Same reasoning for pen/eraser — a stroke needs to start
                // (or an existing drawing needs to get erased) even when the
                // cursor lands on top of another element's box, so this must
                // let the mousedown bubble to the container's own handler
                // rather than selecting/dragging this element instead.
                if (tool === "pen" || tool === "eraser") return;
                // Arrow tool (A): clicking ANY element's body starts a
                // connector drag from it, same as dragging out of one of its
                // anchor dots — nearestEdgeAnchor picks whichever of the 4
                // edges the click landed closest to, so the connector still
                // leaves from a sensible point rather than always the exact
                // center. Selection is deliberately left untouched, matching
                // how a click on an anchor dot doesn't change it either.
                if (tool === "connector") {
                  e.stopPropagation();
                  const world = toWorld(e.clientX, e.clientY);
                  setConnecting({ sourceId: element.id, sourceAnchor: nearestEdgeAnchor(element, world), toWorld: world });
                  return;
                }
                e.stopPropagation();
                // A group behaves as one object: clicking (or starting a
                // drag from) any member always selects every member.
                // Deliberately NOT a "click again to drill into just this
                // member" toggle — that would fire on the very mousedown
                // that starts a drag too (a drag's first event IS a click),
                // silently collapsing the selection back down to 1 element
                // right before the drag itself runs, breaking "drag any
                // member to move the whole group." Editing one member on
                // its own means ungrouping first.
                if (element.groupId) {
                  const groupIds = positioned.filter((el) => el.groupId === element.groupId).map((el) => el.id);
                  if (e.shiftKey) {
                    const wholeGroupSelected = groupIds.every((id) => selectedElementIds.includes(id));
                    onSelectElementIds(
                      wholeGroupSelected
                        ? selectedElementIds.filter((id) => !groupIds.includes(id))
                        : [...new Set([...selectedElementIds, ...groupIds])]
                    );
                  } else {
                    onSelectElementIds(groupIds);
                  }
                  return;
                }
                selectOnMouseDown(element.id, e.shiftKey);
              }}
              onDragStart={() => {
                dragStartRef.current = { x: element.x, y: element.y };
                setIsDraggingElement(true);
                // "Others" excludes the WHOLE selection during a group drag
                // (not just this one element) — snapping a multi-select
                // against a sibling that's moving along with it doesn't mean
                // anything.
                const isGroupDrag = selectedElementIds.length > 1 && isSelected;
                const others = isGroupDrag
                  ? positioned.filter((el) => !selectedElementIds.includes(el.id))
                  : positioned.filter((el) => el.id !== element.id);
                dragCandidatesRef.current = { x: axisCandidates(others, "x"), y: axisCandidates(others, "y") };
              }}
              onDrag={(_e, d) => {
                const candidates = dragCandidatesRef.current;
                if (!dragStartRef.current || !candidates) return;
                if (selectedElementIds.length > 1 && isSelected) {
                  // Snapping the whole group off of the one element the
                  // pointer is actually dragging — everything else in the
                  // selection just follows the same resulting delta, so the
                  // group aligns to other elements exactly like a single
                  // element does, instead of never snapping at all.
                  const snapX = snapAxis(d.x, element.width, candidates.x);
                  const snapY = snapAxis(d.y, element.height, candidates.y);
                  setSnapGuides({ x: snapX.guide, y: snapY.guide });
                  setGroupDragDelta({ dx: snapX.value - dragStartRef.current.x, dy: snapY.value - dragStartRef.current.y });
                  return;
                }
                const snapX = snapAxis(d.x, element.width, candidates.x);
                const snapY = snapAxis(d.y, element.height, candidates.y);
                setSnapGuides({ x: snapX.guide, y: snapY.guide });
                setSingleLivePreview({ id: element.id, x: snapX.value, y: snapY.value, width: element.width, height: element.height });
              }}
              onDragStop={(_e, d) => {
                const start = dragStartRef.current;
                const candidates = dragCandidatesRef.current;
                dragStartRef.current = null;
                dragCandidatesRef.current = null;
                setIsDraggingElement(false);
                setSnapGuides({ x: null, y: null });
                setSingleLivePreview(null);
                if (!candidates) return;
                if (selectedElementIds.length > 1 && isSelected && start) {
                  const snapX = snapAxis(d.x, element.width, candidates.x);
                  const snapY = snapAxis(d.y, element.height, candidates.y);
                  const dx = snapX.value - start.x;
                  const dy = snapY.value - start.y;
                  setGroupDragDelta(null);
                  if (dx !== 0 || dy !== 0) {
                    onUpdateElements(
                      positioned.filter((el) => selectedElementIds.includes(el.id)).map((el) => ({ id: el.id, patch: { x: el.x + dx, y: el.y + dy } }))
                    );
                  }
                  return;
                }
                const snapX = snapAxis(d.x, element.width, candidates.x);
                const snapY = snapAxis(d.y, element.height, candidates.y);
                onUpdateElement(element.id, { x: snapX.value, y: snapY.value });
              }}
              onResizeStart={() => {
                const others = positioned.filter((el) => el.id !== element.id);
                dragCandidatesRef.current = { x: axisCandidates(others, "x"), y: axisCandidates(others, "y") };
              }}
              onResize={(_e, direction, ref, _delta, position) => {
                const candidates = dragCandidatesRef.current;
                if (!candidates) return;
                const { x: fixedX, y: fixedY } = resizeFixedEdges(direction);
                const guideX = fixedX ? snapResizeAxis(position.x, position.x + ref.offsetWidth, fixedX, candidates.x).guide : null;
                const guideY = fixedY ? snapResizeAxis(position.y, position.y + ref.offsetHeight, fixedY, candidates.y).guide : null;
                setSnapGuides({ x: guideX, y: guideY });
                setSingleLivePreview({ id: element.id, x: position.x, y: position.y, width: ref.offsetWidth, height: ref.offsetHeight });
              }}
              onResizeStop={(_e, direction, ref, _delta, position) => {
                setSnapGuides({ x: null, y: null });
                setSingleLivePreview(null);
                const candidates = dragCandidatesRef.current;
                dragCandidatesRef.current = null;
                const { x: fixedX, y: fixedY } = resizeFixedEdges(direction);
                let x = position.x;
                let width = ref.offsetWidth;
                let y = position.y;
                let height = ref.offsetHeight;
                if (candidates) {
                  if (fixedX) {
                    const snapped = snapResizeAxis(x, x + width, fixedX, candidates.x);
                    x = snapped.start;
                    width = snapped.end - snapped.start;
                  }
                  if (fixedY) {
                    const snapped = snapResizeAxis(y, y + height, fixedY, candidates.y);
                    y = snapped.start;
                    height = snapped.end - snapped.start;
                  }
                }
                onUpdateElement(element.id, { width, height, x, y });
              }}
            >
              <div
                className="relative h-full w-full"
                style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
                onDoubleClick={() => {
                  if (tool === "hand" || tool === "connector" || !hasInlineTextEditing(element)) return;
                  onStartEditing(element.id);
                }}
              >
                {isEditingThis && hasInlineTextEditing(element) ? (
                  // Typing straight onto the canvas — the property panel's
                  // own "Nội dung" field (property-panel.tsx) still works
                  // and stays in sync (both write through the same
                  // onUpdateElement), it's just no longer the only way in.
                  // Mounted only while actively editing, not merely
                  // selected — an always-mounted textarea here previously
                  // stole every keyboard shortcut (Tab/Enter mindmap,
                  // Delete, Ctrl+D...) the instant a sticky was selected,
                  // since a focused textarea makes isEditingText() in
                  // whiteboard-editor.tsx true for everything (see
                  // whiteboard-element-renderer.tsx's sticky case, which
                  // deliberately renders a plain non-focusable div instead).
                  // Bullet-list rendering only kicks in once editing stops
                  // (WhiteboardElementRenderer) — a plain textarea can't
                  // show real <li> markers while typing.
                  <textarea
                    autoFocus
                    placeholder={element.type === "sticky" ? "Ghi chú..." : "Nhập nội dung..."}
                    defaultValue={element.content}
                    onChange={(e) => onUpdateElement(element.id, { content: e.target.value })}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={onStopEditing}
                    onSelect={(e) => {
                      if (element.type !== "text") return;
                      setEditingSelection({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") e.currentTarget.blur();
                    }}
                    className={`h-full w-full resize-none overflow-hidden border-none p-3 outline-none ${
                      element.type === "sticky" || element.type === "text" ? "rounded-md" : "bg-transparent"
                    } ${element.type === "shape" ? "text-center" : ""}`}
                    style={{
                      backgroundColor: element.type === "sticky" || element.type === "text" ? element.bgColor : "transparent",
                      color: element.textColor,
                      fontSize: element.fontSize,
                      fontWeight: element.bold ? 700 : undefined,
                      fontStyle: element.type === "text" && element.italic ? "italic" : undefined,
                      textAlign: element.type === "text" ? element.align : undefined,
                      textDecoration:
                        [element.underline && "underline", element.type === "text" && element.strikethrough && "line-through"]
                          .filter(Boolean)
                          .join(" ") || undefined,
                    }}
                  />
                ) : (
                  <WhiteboardElementRenderer element={element} isSelected={isSelected} />
                )}
              </div>
              {isSelected && selectedElementIds.length === 1 && !isEditingThis && (
                <>
                  <AnchorDots
                    box={element}
                    zoom={viewport.zoom}
                    onStartConnect={(anchor, e) => {
                      const world = toWorld(e.clientX, e.clientY);
                      setConnecting({ sourceId: element.id, sourceAnchor: anchor, toWorld: world });
                    }}
                  />
                  <RotateHandle
                    onStart={(e) => {
                      const rect = containerRef.current!.getBoundingClientRect();
                      const centerX = rect.left + viewport.x + (element.x + element.width / 2) * viewport.zoom;
                      const centerY = rect.top + viewport.y + (element.y + element.height / 2) * viewport.zoom;
                      const startAngle = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;
                      rotateStartRef.current = { id: element.id, centerX, centerY, startAngle, startRotation: element.rotation };
                      setRotatingPreview({ id: element.id, rotation: element.rotation });
                    }}
                  />
                </>
              )}
            </Rnd>
          );
        })}
        {/* Live pen-stroke preview while mid-drag — a sibling INSIDE the
            same world-transformed div as every element above, so its raw
            world-space points need no extra coordinate math to pan/zoom in
            lockstep with the rest of the board; onCreateDrawing (called on
            mouseup) is what turns this into a real committed element. */}
        {drawingStroke && drawingStroke.length > 1 && (
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible">
            <polyline
              points={drawingStroke.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={penColor}
              strokeWidth={penSize}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {/* Click-to-place ghost preview — a sibling inside the same
            world-transformed div as every real element, so it scales/pans
            in lockstep with the board at no extra cost, sized to the armed
            type's own default width/height and centered on the cursor
            (matching how onPlaceElementAt itself centers the real element
            on the click point). Hidden until the first mousemove after
            arming gives it a real position. */}
        {placingType && placingGhostSize && placingCursorWorld && (
          <div
            className="pointer-events-none absolute rounded-lg border-2 border-dashed border-primary bg-primary-bg"
            style={{
              left: placingCursorWorld.x - placingGhostSize.width / 2,
              top: placingCursorWorld.y - placingGhostSize.height / 2,
              width: placingGhostSize.width,
              height: placingGhostSize.height,
            }}
          />
        )}
        {/* Group bounding-box overlay — a plain world-space div (like every
            element above, benefiting from the same ambient pan/zoom
            transform for free) with 4 corner resize handles + a rotate
            handle. Hidden during an ad-hoc drag/rotate/connector gesture,
            same guard SelectionToolbar/AnchorDots use below, so it never
            visually lags behind a live preview it doesn't itself drive. */}
        {tool === "select" &&
          selectedGroup &&
          !isDraggingElement &&
          !connecting &&
          !rotatingPreview &&
          (() => {
            const group = selectedGroup;
            const box = liveGroupBox(group);
            const corners: { corner: GroupResizeCorner; left: number | string; top: number | string; cursor: string }[] = [
              { corner: "topLeft", left: 0, top: 0, cursor: "nwse-resize" },
              { corner: "topRight", left: box.width, top: 0, cursor: "nesw-resize" },
              { corner: "bottomLeft", left: 0, top: box.height, cursor: "nesw-resize" },
              { corner: "bottomRight", left: box.width, top: box.height, cursor: "nwse-resize" },
            ];
            // Border width and the corner/rotate dots are all authored for
            // a 100%-zoom view; this whole overlay lives inside the world
            // div's scale(viewport.zoom) transform (same story as
            // AnchorDots above), so at a zoomed-out view they'd otherwise
            // shrink to a barely-visible hairline and a few-pixel dot.
            // Dividing by zoom here cancels that shrink, same "counter-scale
            // to stay a constant screen size" fix as AnchorDots.
            const inverseScale = 1 / viewport.zoom;
            return (
              <div
                className="pointer-events-none absolute z-20 border-dashed border-primary"
                style={{ left: box.x, top: box.y, width: box.width, height: box.height, borderWidth: 2 * inverseScale }}
              >
                {corners.map(({ corner, left, top, cursor }) => (
                  <div
                    key={corner}
                    onMouseDown={startGroupResize(corner, group)}
                    className="pointer-events-auto absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{ left, top, cursor }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center" style={{ transform: `scale(${inverseScale})` }}>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-primary bg-white" />
                    </div>
                  </div>
                ))}
                <div
                  onMouseDown={startGroupRotate(group)}
                  className="pointer-events-auto absolute left-1/2 top-0 flex h-6 w-6 -translate-x-1/2 -translate-y-8 cursor-grab items-center justify-center"
                  title="Xoay cả nhóm"
                >
                  <div className="flex h-6 w-6 items-center justify-center" style={{ transform: `scale(${inverseScale})` }}>
                    <span className="h-3 w-3 rounded-full border-2 border-primary bg-white" />
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
      {tool === "select" &&
        !isDraggingElement &&
        !connecting &&
        selectedElementIds.length === 1 &&
        (() => {
          const selected = elementsById.get(selectedElementIds[0]);
          if (!selected) return null;
          return (
            <SelectionToolbar
              element={selected}
              screenX={(selected.x + selected.width / 2) * viewport.zoom + viewport.x}
              screenY={selected.y * viewport.zoom + viewport.y}
              onUpdateElement={(patch) => onUpdateElement(selected.id, patch)}
              onConvertKind={onConvertSelectedKind}
              onDuplicate={onDuplicateSelected}
              onDelete={onDeleteSelected}
              editingSelection={selected.id === editingElementId ? editingSelection : null}
              onComment={() => setComposingCommentElementId(selected.id)}
            />
          );
        })()}
      {tool === "select" &&
        !editingElementId &&
        !isDraggingElement &&
        !connecting &&
        selectedElementIds.length === 1 &&
        (() => {
          const connector = connectors.find((c) => c.id === selectedElementIds[0]);
          if (!connector) return null;
          const source = elementsById.get(connector.sourceId);
          const target = elementsById.get(connector.targetId);
          if (!source || !target) return null;
          const from = getAnchorPoint(source, connector.sourceAnchor);
          const to = getAnchorPoint(target, connector.targetAnchor);
          const midWorld = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
          return (
            <ConnectorToolbar
              connector={connector}
              screenX={midWorld.x * viewport.zoom + viewport.x}
              screenY={midWorld.y * viewport.zoom + viewport.y}
              onUpdateConnector={(patch) => onUpdateElement(connector.id, patch)}
              onDelete={onDeleteSelected}
            />
          );
        })()}
      {connecting &&
        (() => {
          const source = elementsById.get(connecting.sourceId);
          if (!source) return null;
          const from = getAnchorPoint(source, connecting.sourceAnchor);
          const fromScreen = { x: from.x * viewport.zoom + viewport.x, y: from.y * viewport.zoom + viewport.y };
          // Live target-snap preview — same elementAtPoint/nearestEdgeAnchor
          // pair the actual mouseup handler uses (see the `connecting`
          // effect above), so whatever this shows is EXACTLY what letting
          // go right now would create. Without this, the preview line just
          // followed the raw cursor with no visible anchor dot to aim at,
          // making it hard to land on the right spot (the whole point of
          // this indicator).
          const hoveredTarget = elementAtPoint(
            positioned.filter((el) => el.id !== connecting.sourceId),
            connecting.toWorld
          );
          const targetAnchor = hoveredTarget ? nearestEdgeAnchor(hoveredTarget, connecting.toWorld) : null;
          const snapPoint = hoveredTarget && targetAnchor ? getAnchorPoint(hoveredTarget, targetAnchor) : connecting.toWorld;
          const toScreenPoint = { x: snapPoint.x * viewport.zoom + viewport.x, y: snapPoint.y * viewport.zoom + viewport.y };
          return (
            <>
              {hoveredTarget && (
                <div
                  className="pointer-events-none absolute rounded-md border-2 border-primary"
                  style={{
                    left: hoveredTarget.x * viewport.zoom + viewport.x,
                    top: hoveredTarget.y * viewport.zoom + viewport.y,
                    width: hoveredTarget.width * viewport.zoom,
                    height: hoveredTarget.height * viewport.zoom,
                  }}
                />
              )}
              <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <line x1={fromScreen.x} y1={fromScreen.y} x2={toScreenPoint.x} y2={toScreenPoint.y} stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 3" />
                {hoveredTarget && <circle cx={toScreenPoint.x} cy={toScreenPoint.y} r={8} fill="var(--primary)" stroke="white" strokeWidth={2} />}
              </svg>
            </>
          );
        })()}
      {snapGuides.x != null && (
        <div className="pointer-events-none absolute inset-y-0 w-px bg-primary" style={{ left: snapGuides.x * viewport.zoom + viewport.x }} />
      )}
      {snapGuides.y != null && (
        <div className="pointer-events-none absolute inset-x-0 h-px bg-primary" style={{ top: snapGuides.y * viewport.zoom + viewport.y }} />
      )}
      {marquee && (
        <div
          className="pointer-events-none absolute border border-primary bg-primary/10"
          style={{
            left: Math.min(marquee.startX, marquee.x) * viewport.zoom + viewport.x,
            top: Math.min(marquee.startY, marquee.y) * viewport.zoom + viewport.y,
            width: Math.abs(marquee.x - marquee.startX) * viewport.zoom,
            height: Math.abs(marquee.y - marquee.startY) * viewport.zoom,
          }}
        />
      )}
      <CommentPins
        threads={commentThreads}
        elementsById={elementsById}
        viewport={viewport}
        composingForElementId={composingCommentElementId}
        onCancelComposing={() => setComposingCommentElementId(null)}
        onPlaceThread={(content) => {
          if (!composingCommentElementId) return;
          onPlaceCommentThread(composingCommentElementId, DEFAULT_ANCHOR_U, DEFAULT_ANCHOR_V, content);
          setComposingCommentElementId(null);
        }}
        onReply={onReplyComment}
        onToggleResolved={onToggleCommentResolved}
        onMoveAnchor={onMoveCommentAnchor}
      />
    </div>
  );
}
