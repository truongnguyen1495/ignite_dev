// Positions for the Team Network canvas. A small tidy-tree layout: every level
// sits in its own column (or row), children are stacked along the other axis
// and each parent is centred on its children. Pure arithmetic over the
// already-filtered visible tree, so it is cheap to rerun on every collapse,
// filter or move and easy to test.
//
// Left-to-right is the default because a leader with twenty direct members
// becomes a tall column you scroll, instead of a row 5,000px wide.

export type LayoutDirection = "horizontal" | "vertical";

export type Rect = { x: number; y: number; width: number; height: number };

export type Size = { width: number; height: number };

// Card sizes. The node components render at exactly these dimensions (React
// Flow needs them up front so a fitView can run before any node is measured).
//
// Heights are the content's real height plus a little air, measured in the
// browser: padding 20 + name row 30 + status row 30 + downline line 21 ≈ 100.
// A card that is shorter than its content clips the last line.
export const MEMBER_NODE: Size = { width: 228, height: 104 };
export const BRANCH_NODE: Size = { width: 228, height: 128 };
export const BRANCH_CARD: Size = { width: 252, height: 190 };
export const BUCKET_NODE: Size = { width: 216, height: 72 };

const GAPS: Record<LayoutDirection, { depth: number; breadth: number }> = {
  horizontal: { depth: 68, breadth: 12 },
  vertical: { depth: 56, breadth: 20 },
};
// Space between two separate trees (for example the organisation root and the
// unassigned bucket) stacked next to each other.
const ROOT_GAP = 40;

export function layoutTree(args: {
  roots: readonly string[];
  kids: (id: string) => readonly string[];
  size: (id: string, depth: number) => Size;
  direction: LayoutDirection;
}): Map<string, Rect> {
  const { roots, kids, size, direction } = args;
  const horizontal = direction === "horizontal";
  const gap = GAPS[direction];

  type Info = { depth: number; d: number; b: number; ext: number; sum: number; kids: readonly string[]; w: number; h: number };
  const info = new Map<string, Info>();
  const columnDepth: number[] = [];

  // Pass 1: how much room each subtree needs along the breadth axis, and how
  // thick each level is along the depth axis.
  const measure = (id: string, depth: number): number => {
    const { width, height } = size(id, depth);
    const d = horizontal ? width : height;
    const b = horizontal ? height : width;
    const children = kids(id);
    let sum = 0;
    children.forEach((child, i) => {
      sum += measure(child, depth + 1) + (i > 0 ? gap.breadth : 0);
    });
    const ext = Math.max(b, sum);
    info.set(id, { depth, d, b, ext, sum, kids: children, w: width, h: height });
    columnDepth[depth] = Math.max(columnDepth[depth] ?? 0, d);
    return ext;
  };

  for (const root of roots) measure(root, 0);

  const depthOffset: number[] = [0];
  for (let i = 1; i < columnDepth.length; i++) depthOffset[i] = depthOffset[i - 1] + columnDepth[i - 1] + gap.depth;

  const result = new Map<string, Rect>();

  // Pass 2: place subtrees left to right along the breadth axis, centring each
  // parent between its first and last child.
  const place = (id: string, start: number): number => {
    const n = info.get(id)!;
    let center: number;
    if (n.kids.length === 0) {
      center = start + n.ext / 2;
    } else {
      let cursor = start + (n.ext - n.sum) / 2;
      const centers: number[] = [];
      for (const child of n.kids) {
        centers.push(place(child, cursor));
        cursor += info.get(child)!.ext + gap.breadth;
      }
      center = (centers[0] + centers[centers.length - 1]) / 2;
    }
    const breadthPos = center - n.b / 2;
    const depthPos = depthOffset[n.depth];
    result.set(
      id,
      horizontal
        ? { x: depthPos, y: breadthPos, width: n.w, height: n.h }
        : { x: breadthPos, y: depthPos, width: n.w, height: n.h }
    );
    return center;
  };

  let cursor = 0;
  for (const root of roots) {
    place(root, cursor);
    cursor += info.get(root)!.ext + ROOT_GAP;
  }

  return result;
}

// Bounding box of a set of placed rects, or null when there are none.
export function boundsOf(rects: Iterable<Rect>): Rect | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.width);
    y1 = Math.max(y1, r.y + r.height);
  }
  if (x0 === Infinity) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
