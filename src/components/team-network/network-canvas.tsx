"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minimize2, Minus, Plus, Scan } from "lucide-react";
import { boundsOf, type Rect } from "@/lib/network-layout";
import { TreeActionsContext, TreeEdgeView, TreeNodeView, type TreeActions, type TreeNode } from "./tree-node";

// Declared once, outside any component: React Flow compares these by identity
// and would rebuild every card if it saw a new object on each render.
const nodeTypes: NodeTypes = { tree: TreeNodeView };
const edgeTypes: EdgeTypes = { tree: TreeEdgeView };

// A request for the camera. `nonce` makes asking twice for the same thing work.
//   fit     frame everything that is on screen
//   focus   centre on one card, zooming in if it is small
//   reveal  centre on one card only if it is off screen (after a click)
export type CanvasCommand = { kind: "fit"; nonce: number } | { kind: "focus" | "reveal"; id: string; nonce: number };

const PADDING = 56;
const TOP_INSET = 36; // room for the breadcrumb that floats over the top edge
const MIN_ZOOM = 0.08; // low enough that "fit" can show a ~7,000px column (about 60 people in one branch)
const MAX_ZOOM = 1.6;

// React Flow lets the pointer reach a card only if the card is draggable,
// selectable or the flow has some node-level mouse handler; none of that applies
// here (the cards do their own click handling), so without this the empty pane
// sits on top and swallows every click. A deliberate no-op.
const keepCardsClickable = () => undefined;

// Dark mode paints the flow with its own near-black; the app's navy shows
// through instead when the flow's background variable is cleared.
const flowStyle = { "--xy-background-color": "transparent" } as CSSProperties;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function Camera({ rects, command }: { rects: ReadonlyMap<string, Rect>; command: CanvasCommand | null }) {
  const rf = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const domNode = useStore((s) => s.domNode);
  // A command may arrive before the canvas has been measured (a shared link
  // opens straight onto a member). It waits for a size, then runs exactly once.
  const handled = useRef(0);

  useEffect(() => {
    if (!command || width === 0 || height === 0 || handled.current === command.nonce) return;
    // Wait a frame so React Flow has taken the new nodes before the camera moves.
    const frame = requestAnimationFrame(() => {
      handled.current = command.nonce;
      // Measure the canvas now instead of trusting the store. Choosing a card opens
      // the detail panel in the same render, which narrows the canvas, and React
      // Flow only hears about that after this frame: with the stale width a card
      // near the right edge was judged "on screen" and left half under the panel.
      const w = domNode?.clientWidth || width;
      const h = domNode?.clientHeight || height;

      if (command.kind === "fit") {
        const box = boundsOf(rects.values());
        if (!box) return;
        // Down to the canvas's own minimum: "fit" has to show everything. A floor above
        // it cropped the real 124-person map (a column of ~40 cards is ~4,500px tall).
        const zoom = clamp(Math.min((w - PADDING * 2) / box.width, (h - PADDING * 2 - TOP_INSET) / box.height), MIN_ZOOM, 1);
        void rf.setViewport(
          {
            x: (w - box.width * zoom) / 2 - box.x * zoom,
            y: (h - box.height * zoom) / 2 - box.y * zoom + TOP_INSET / 2,
            zoom,
          },
          { duration: 300 }
        );
        return;
      }

      const rect = rects.get(command.id);
      if (!rect) return;
      const view = rf.getViewport();
      if (command.kind === "reveal") {
        const left = rect.x * view.zoom + view.x;
        const top = rect.y * view.zoom + view.y;
        const margin = 24;
        const inside =
          left >= margin &&
          top >= margin + TOP_INSET &&
          left + rect.width * view.zoom <= w - margin &&
          top + rect.height * view.zoom <= h - margin;
        if (inside) return;
      }
      // setCenter would centre on the store's width; this is the same arithmetic on the measured one.
      const zoom = clamp(Math.max(view.zoom, 0.9), MIN_ZOOM, MAX_ZOOM);
      void rf.setViewport(
        { x: w / 2 - (rect.x + rect.width / 2) * zoom, y: h / 2 - (rect.y + rect.height / 2) * zoom, zoom },
        { duration: 400 }
      );
    });
    return () => cancelAnimationFrame(frame);
    // `rects` is read from the render the command arrived in; a later change to it
    // must not move the camera again, so it is deliberately not a dependency.
    // `handled` is set inside the frame, so a resize that lands before it reschedules
    // the move instead of silently dropping it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, width, height]);

  return null;
}

function ZoomControls({ onFit, expanded, onToggleExpand }: { onFit: () => void; expanded: boolean; onToggleExpand: () => void }) {
  const rf = useReactFlow();
  const percent = useStore((s) => Math.round(s.transform[2] * 100));
  const button =
    "flex h-8 w-9 items-center justify-center text-muted transition-colors hover:bg-surface-hover hover:text-foreground";
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface" role="group" aria-label="Thu phóng">
      <button type="button" className={`${button} border-b border-border`} aria-label="Phóng to" onClick={() => void rf.zoomIn({ duration: 200 })}>
        <Plus className="h-4 w-4" />
      </button>
      <span className="border-b border-border py-1 text-center text-[10.5px] tabular-nums text-faint">{percent}%</span>
      <button type="button" className={`${button} border-b border-border`} aria-label="Thu nhỏ" onClick={() => void rf.zoomOut({ duration: 200 })}>
        <Minus className="h-4 w-4" />
      </button>
      <button type="button" className={`${button} border-b border-border`} aria-label="Vừa khung" title="Vừa khung: căn lại cho thấy cả sơ đồ" onClick={onFit}>
        <Scan className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={button}
        aria-label={expanded ? "Thoát toàn màn hình" : "Toàn màn hình"}
        aria-pressed={expanded}
        title={expanded ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"}
        onClick={onToggleExpand}
      >
        {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function NetworkCanvas({
  nodes,
  edges,
  rects,
  command,
  actions,
  overlay,
  legend,
  onFit,
  expanded,
  onToggleExpand,
}: {
  nodes: TreeNode[];
  edges: Edge[];
  rects: ReadonlyMap<string, Rect>;
  command: CanvasCommand | null;
  actions: TreeActions;
  /** Floats over the top-left (the breadcrumb). */
  overlay: ReactNode;
  legend: ReactNode;
  onFit: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <TreeActionsContext.Provider value={actions}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="dark"
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          defaultViewport={{ x: 40, y: 40, zoom: 0.8 }}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          onlyRenderVisibleElements
          onNodeClick={keepCardsClickable}
          style={flowStyle}
          proOptions={{ hideAttribution: false }}
          // Cards glide to their new place when someone moves (a leader change,
          // a collapse) instead of jumping; panning is unaffected because the
          // cards themselves do not move while the viewport does.
          className="[&_.react-flow__node]:transition-transform [&_.react-flow__node]:duration-300 motion-reduce:[&_.react-flow__node]:transition-none"
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="rgba(247, 242, 231, 0.14)" />
          <Camera rects={rects} command={command} />
          <Panel position="top-left" className="!m-3 max-w-[calc(100%-5rem)]">
            {overlay}
          </Panel>
          <Panel position="top-right" className="!m-3">
            <ZoomControls onFit={onFit} expanded={expanded} onToggleExpand={onToggleExpand} />
          </Panel>
          <Panel position="bottom-left" className="!m-3">
            {legend}
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </TreeActionsContext.Provider>
  );
}
