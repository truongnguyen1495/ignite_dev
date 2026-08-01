"use client";

import type { ConnectorAnchor, ConnectorElement, ConnectorKind, PositionedWhiteboardElement } from "@/lib/whiteboard-elements";
import { getAnchorPoint } from "@/lib/whiteboard-geometry";
import type { Viewport } from "./whiteboard-canvas";

type Point = { x: number; y: number };

// Unit vector pointing OUT of the element's box from this anchor — "up" for
// top, "down" for bottom, etc. Drives both the curved kind's bezier control
// points and each arrowhead's orientation. "center" (used before an anchor
// is explicitly picked) has no natural outward direction, so it degrades to
// a zero vector — same as a straight line's endpoint.
function anchorOutwardDir(anchor: ConnectorAnchor): Point {
  switch (anchor) {
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "center":
      return { x: 0, y: 0 };
  }
}

// Small filled triangle at `to`, oriented along the `dir` unit vector —
// used instead of an SVG <marker> so each connector's arrowhead can take its
// own stroke color with no per-color marker-def bookkeeping.
function arrowheadPoints(to: Point, dir: Point, size = 9): string {
  const baseX = to.x - dir.x * size;
  const baseY = to.y - dir.y * size;
  const perpX = -dir.y * (size / 2.2);
  const perpY = dir.x * (size / 2.2);
  return `${to.x},${to.y} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`;
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

const DASH_ARRAYS: Record<ConnectorElement["dash"], string | undefined> = {
  solid: undefined,
  dashed: "10 6",
  dotted: "1 6",
};

// Builds the SVG path + the two endpoints' tangent directions (for
// arrowhead orientation) for one connector, entirely from its live
// source/target screen points — nothing about a connector's shape is ever
// stored beyond its `kind`, matching the "recomputed every render" contract
// the rest of this file already follows for straight lines.
function buildPath(
  from: Point,
  to: Point,
  sourceAnchor: ConnectorAnchor,
  targetAnchor: ConnectorAnchor,
  kind: ConnectorKind
): { d: string; startDir: Point; endDir: Point } {
  if (kind === "straight") {
    return { d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`, startDir: normalize({ x: from.x - to.x, y: from.y - to.y }), endDir: normalize({ x: to.x - from.x, y: to.y - from.y }) };
  }
  if (kind === "curved") {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const offset = Math.min(dist / 2, 80);
    const sourceDir = anchorOutwardDir(sourceAnchor);
    const targetDir = anchorOutwardDir(targetAnchor);
    const c1 = { x: from.x + sourceDir.x * offset, y: from.y + sourceDir.y * offset };
    const c2 = { x: to.x + targetDir.x * offset, y: to.y + targetDir.y * offset };
    return {
      d: `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`,
      startDir: normalize({ x: from.x - c1.x, y: from.y - c1.y }),
      endDir: normalize({ x: to.x - c2.x, y: to.y - c2.y }),
    };
  }
  // "elbow" — a simple two-segment right-angle router: exits/enters each
  // anchor along its own outward axis, meeting at the midpoint on whichever
  // axis the source anchor points along. Not obstacle-aware (real Miro's
  // elbow router dodges intervening shapes), just a predictable right-angle
  // path between the two anchor points.
  const sourceVertical = sourceAnchor === "top" || sourceAnchor === "bottom";
  const corner1 = sourceVertical ? { x: from.x, y: (from.y + to.y) / 2 } : { x: (from.x + to.x) / 2, y: from.y };
  const corner2 = sourceVertical ? { x: to.x, y: (from.y + to.y) / 2 } : { x: (from.x + to.x) / 2, y: to.y };
  return {
    d: `M ${from.x} ${from.y} L ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${to.x} ${to.y}`,
    startDir: normalize({ x: from.x - corner1.x, y: from.y - corner1.y }),
    endDir: normalize({ x: to.x - corner2.x, y: to.y - corner2.y }),
  };
}

function toScreen(point: Point, viewport: Viewport): Point {
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
}

// SVG overlay sized to the full canvas container and rendered as a SIBLING
// of the pan/zoom-transformed world div (see whiteboard-canvas.tsx) — NOT a
// child inside it. An earlier version nested a 0×0 `overflow: visible` <svg>
// inside the transformed div to inherit the ancestor's CSS transform for
// free (the same trick editor-canvas.tsx's snap-guide lines use via
// react-rnd's `scale` prop); that approach computed mathematically correct
// coordinates (verified via getBoundingClientRect) but silently failed to
// actually PAINT in real testing — an SVG nested inside a `transform`-scaled
// ancestor with explicit 0×0 dimensions turned out not to reliably render
// its overflow content. This version sidesteps the whole question: every
// point is converted to real screen-space pixels with `toScreen` (the same
// `worldValue * zoom + pan` formula already used for the marquee box and
// snap-guide lines below, which DO render correctly), so the SVG never
// depends on inherited transforms at all. Every connector's endpoints are
// still recomputed from its source/target elements' CURRENT box on every
// render — nothing about a connector's position is ever stored.
export function ConnectorLayer({
  connectors,
  elementsById,
  liveOverrides,
  viewport,
  selectedElementIds,
  onSelectConnector,
  interactive,
}: {
  connectors: ConnectorElement[];
  elementsById: Map<string, PositionedWhiteboardElement>;
  // Boxes for whichever element(s) are mid-drag/resize/rotate right now —
  // overrides elementsById's (committed, so momentarily stale during a
  // gesture) x/y/width/height for exactly the endpoints affected, so a
  // connector visibly follows along instead of waiting for the gesture to
  // end. See whiteboard-canvas.tsx's connectorLiveOverrides for how this is
  // assembled from whichever of drag/resize/rotate is currently active.
  liveOverrides: Map<string, { x: number; y: number; width: number; height: number }> | null;
  viewport: Viewport;
  selectedElementIds: string[];
  onSelectConnector: (id: string, additive: boolean) => void;
  // False while the hand/pan tool is active — the hit-path below must let
  // clicks pass straight through to the canvas container so dragging over a
  // connector line pans instead of (fruitlessly, since selection is
  // disabled in hand mode) trying to select it.
  interactive: boolean;
}) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {connectors.map((connector) => {
        const source = elementsById.get(connector.sourceId);
        const target = elementsById.get(connector.targetId);
        if (!source || !target) return null;
        const sourceOverride = liveOverrides?.get(connector.sourceId);
        const targetOverride = liveOverrides?.get(connector.targetId);
        const sourceBox = sourceOverride ? { ...source, ...sourceOverride } : source;
        const targetBox = targetOverride ? { ...target, ...targetOverride } : target;
        const from = toScreen(getAnchorPoint(sourceBox, connector.sourceAnchor), viewport);
        const to = toScreen(getAnchorPoint(targetBox, connector.targetAnchor), viewport);
        const { d, startDir, endDir } = buildPath(from, to, connector.sourceAnchor, connector.targetAnchor, connector.kind);
        const isSelected = selectedElementIds.includes(connector.id);
        const color = isSelected ? "var(--primary)" : connector.stroke;
        return (
          <g key={connector.id}>
            {/* Wide invisible hit-path — the visible stroke is often only
                1-3px, too thin a target to click reliably. */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              style={{ pointerEvents: interactive ? "stroke" : "none", cursor: "pointer" }}
              onMouseDown={(e) => {
                if (!interactive) return;
                e.stopPropagation();
                onSelectConnector(connector.id, e.shiftKey);
              }}
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={isSelected ? connector.strokeWidth + 1 : connector.strokeWidth}
              strokeDasharray={DASH_ARRAYS[connector.dash]}
              strokeLinecap={connector.dash === "dotted" ? "round" : undefined}
              style={{ pointerEvents: "none" }}
            />
            {connector.arrowEnd && <polygon points={arrowheadPoints(to, endDir)} fill={color} style={{ pointerEvents: "none" }} />}
            {connector.arrowStart && <polygon points={arrowheadPoints(from, startDir)} fill={color} style={{ pointerEvents: "none" }} />}
          </g>
        );
      })}
    </svg>
  );
}
