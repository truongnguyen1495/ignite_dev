import type { ConnectorElement, PositionedWhiteboardElement, WhiteboardElement } from "@/lib/whiteboard-elements";
import { isConnector } from "@/lib/whiteboard-elements";

const CHILD_GUTTER_X = 80;
const SIBLING_GAP_Y = 24;

// A mindmap "node" is just a regular positioned element; its parent is
// whichever connector currently targets it — assumes at most one incoming
// connector per node (true for tree-shaped mindmaps, see the schema
// comment on connectorElementSchema). No parentId field exists on purpose.
export function findParentConnector(elements: WhiteboardElement[], nodeId: string): ConnectorElement | undefined {
  return elements.filter(isConnector).find((c) => c.targetId === nodeId);
}

export function findChildElements(
  elements: WhiteboardElement[],
  nodeId: string
): PositionedWhiteboardElement[] {
  const childIds = new Set(
    elements.filter(isConnector).filter((c) => c.sourceId === nodeId).map((c) => c.targetId)
  );
  return elements.filter((el): el is PositionedWhiteboardElement => !isConnector(el) && childIds.has(el.id));
}

// Placement for a brand-new child of `parent` (Tab) — stacks below whatever
// children it already has, vertically centered on the parent when it has
// none yet. Deliberately not a general tree-layout solver: "good enough" to
// avoid overlap for the common case of building out a mindmap top-down.
// Sized to match `parent` (same idea as placeNewSibling matching `node`
// below) rather than a fixed default — a child branched off a large node
// otherwise came out tiny enough that its own anchor dots (a fixed screen
// size regardless of zoom, see AnchorDots in whiteboard-canvas.tsx) visibly
// overlapped each other.
export function placeNewChild(
  parent: PositionedWhiteboardElement,
  existingChildren: PositionedWhiteboardElement[]
): { x: number; y: number; width: number; height: number } {
  const width = parent.width;
  const height = parent.height;
  const x = parent.x + parent.width + CHILD_GUTTER_X;

  if (existingChildren.length === 0) {
    return { x, y: parent.y + parent.height / 2 - height / 2, width, height };
  }

  const lowest = existingChildren.reduce((a, b) => (a.y + a.height > b.y + b.height ? a : b));
  return { x, y: lowest.y + lowest.height + SIBLING_GAP_Y, width, height };
}

// Placement for a new sibling of `node` (Enter) — appended below the lowest
// existing sibling in the same parent's child column, aligned to `node`'s x
// so it stays in the same visual column regardless of which sibling was
// selected. A node with no parent just gets an unconnected node placed
// below it instead (see whiteboard-editor.tsx's Enter handler).
export function placeNewSibling(
  node: PositionedWhiteboardElement,
  siblings: PositionedWhiteboardElement[]
): { x: number; y: number; width: number; height: number } {
  const width = node.width;
  const height = node.height;
  const all = siblings.length > 0 ? siblings : [node];
  const lowest = all.reduce((a, b) => (a.y + a.height > b.y + b.height ? a : b));
  return { x: node.x, y: lowest.y + lowest.height + SIBLING_GAP_Y, width, height };
}
