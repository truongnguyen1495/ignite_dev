import type { ConnectorAnchor, DrawingElement, PositionedWhiteboardElement } from "@/lib/whiteboard-elements";

type Box = { x: number; y: number; width: number; height: number };

// World-space coordinate of one of an element's 4 edge-midpoints (or its
// center) — the single source of truth both connector-layer.tsx (drawing a
// connector's live endpoints) and whiteboard-canvas.tsx (the anchor-dot drag
// handles) read from, so a connector can never visually disagree with where
// its anchor dot actually sits.
export function getAnchorPoint(box: Box, anchor: ConnectorAnchor): { x: number; y: number } {
  switch (anchor) {
    case "top":
      return { x: box.x + box.width / 2, y: box.y };
    case "bottom":
      return { x: box.x + box.width / 2, y: box.y + box.height };
    case "left":
      return { x: box.x, y: box.y + box.height / 2 };
    case "right":
      return { x: box.x + box.width, y: box.y + box.height / 2 };
    case "center":
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
}

const EDGE_ANCHORS: ConnectorAnchor[] = ["top", "right", "bottom", "left"];

// Whichever of an element's 4 edges a dropped connector endpoint landed
// closest to — used when the admin releases a connector drag over an
// element's body rather than one of its explicit anchor dots (simplest v1
// rule, see connector interaction design).
export function nearestEdgeAnchor(box: Box, point: { x: number; y: number }): ConnectorAnchor {
  let best: ConnectorAnchor = "center";
  let bestDist = Infinity;
  for (const anchor of EDGE_ANCHORS) {
    const p = getAnchorPoint(box, anchor);
    const dist = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = anchor;
    }
  }
  return best;
}

// Rotates `point` into the element's own unrotated frame (around its
// center) before the plain axis-aligned bounds check — without this, a
// rotated element's hit box stayed axis-aligned to the *screen*, so a
// connector dropped visually on top of a tilted shape could miss it
// entirely (or hit a neighboring element instead) once the tilt was more
// than a few degrees.
function isPointInElement(el: PositionedWhiteboardElement, point: { x: number; y: number }): boolean {
  if (!el.rotation) {
    return point.x >= el.x && point.x <= el.x + el.width && point.y >= el.y && point.y <= el.y + el.height;
  }
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rad = (-el.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - cx;
  const dy = point.y - cy;
  const localX = cx + dx * cos - dy * sin;
  const localY = cy + dx * sin + dy * cos;
  return localX >= el.x && localX <= el.x + el.width && localY >= el.y && localY <= el.y + el.height;
}

export function elementAtPoint(
  elements: PositionedWhiteboardElement[],
  point: { x: number; y: number }
): PositionedWhiteboardElement | null {
  // Topmost (highest zIndex) element whose box contains the point — iterate
  // back-to-front so the first hit is already the topmost.
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  for (const el of sorted) {
    if (isPointInElement(el, point)) return el;
  }
  return null;
}

// World-space points of a drawing element, accounting for any resize since
// it was drawn — mirrors EXACTLY what WhiteboardElementRenderer's "drawing"
// case hands the SVG viewBox (same padded natural-bounds computation), so a
// point this function says is "on" the stroke always agrees with what's
// actually visible on screen. Recomputed from `points` alone (never from a
// separately-stored "natural size") because `points` are the only thing that
// never changes after a resize — see drawingElementSchema's own comment.
export function drawingWorldPoints(el: DrawingElement): { x: number; y: number }[] {
  const xs = el.points.map((p) => p.x);
  const ys = el.points.map((p) => p.y);
  const pad = el.strokeWidth / 2 + 2;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const natWidth = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, 1e-6);
  const natHeight = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, 1e-6);
  const scaleX = el.width / natWidth;
  const scaleY = el.height / natHeight;
  return el.points.map((p) => ({ x: el.x + (p.x - minX) * scaleX, y: el.y + (p.y - minY) * scaleY }));
}

function distanceToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Precise (not just bounding-box) hit test for the stroke-eraser tool — a
// long diagonal stroke has a bounding box far bigger than the visible ink,
// so testing against `el.x/y/width/height` alone would erase strokes the
// eraser cursor never actually touched. `zoom` shrinks the screen-space
// fudge factor into world units so the hit target feels the same physical
// size on screen at any zoom level.
export function isPointNearDrawing(el: DrawingElement, point: { x: number; y: number }, zoom: number): boolean {
  const tolerance = el.strokeWidth / 2 + 6 / zoom;
  const pts = drawingWorldPoints(el);
  if (pts.length === 1) return Math.hypot(point.x - pts[0].x, point.y - pts[0].y) <= tolerance;
  for (let i = 1; i < pts.length; i++) {
    if (distanceToSegment(point, pts[i - 1], pts[i]) <= tolerance) return true;
  }
  return false;
}
