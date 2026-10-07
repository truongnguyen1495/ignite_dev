// Which part of the tree is on screen. The full tree is cheap to hold in
// memory but not to draw once Team Network has thousands of people, so the
// canvas only ever shows what survives collapse, compact mode, focusing on one
// branch and "only branches with results". Pure, so the rules are tested
// without a browser.
import { UNASSIGNED_ID, type NetworkTree } from "./network-tree";

export type VisibleNode = { id: string; depth: number; parent: string | null };

export type VisibleTree = {
  /** Drawing order: each node before its children. */
  nodes: VisibleNode[];
  /** Children that are actually shown, per shown node. */
  kids: Map<string, string[]>;
  roots: string[];
};

// A fresh page opens two levels deep (root and its branch heads, then their
// direct members), which is what fits on a screen and what a manager wants
// first. Anything below that, and the unassigned bucket, starts folded.
export function defaultCollapsed(tree: NetworkTree): Set<string> {
  const folded = new Set<string>();
  const stack: { id: string; depth: number }[] = tree.roots.map((id) => ({ id, depth: 0 }));
  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    const kids = tree.kids.get(id) ?? [];
    if (kids.length > 0 && (depth >= 2 || id === UNASSIGNED_ID)) folded.add(id);
    for (const kid of kids) stack.push({ id: kid, depth: depth + 1 });
  }
  return folded;
}

// Every node that matches, plus every ancestor of one — the skeleton of a
// "show me only the branches that contain results" view.
export function ancestorsOfMatches(tree: NetworkTree, isMatch: (id: string) => boolean): Set<string> {
  const keep = new Set<string>();
  const visit = (id: string): boolean => {
    let any = id !== UNASSIGNED_ID && isMatch(id);
    for (const kid of tree.kids.get(id) ?? []) if (visit(kid)) any = true;
    if (any) keep.add(id);
    return any;
  };
  for (const root of tree.roots) visit(root);
  return keep;
}

export function computeVisibleTree(args: {
  tree: NetworkTree;
  collapsed: ReadonlySet<string>;
  /** Show only the top level and its direct children as summary cards. */
  compact: boolean;
  /** Draw just this subtree, as if it were the whole network. */
  focusRoot: string | null;
  /** When set, draw only these ids and ignore collapsed folds. */
  keep: ReadonlySet<string> | null;
}): VisibleTree {
  const { tree, collapsed, compact, focusRoot, keep } = args;
  const roots = focusRoot && tree.kids.has(focusRoot) ? [focusRoot] : tree.roots;
  // Compact mode is a way to survey the top of a big network; once the admin
  // has zoomed into one branch they want that branch's real tree.
  const compactActive = compact && !focusRoot;

  const nodes: VisibleNode[] = [];
  const kids = new Map<string, string[]>();
  const shownRoots: string[] = [];

  const walk = (id: string, depth: number, parent: string | null) => {
    if (keep && !keep.has(id)) return;
    nodes.push({ id, depth, parent });
    const children = tree.kids.get(id) ?? [];
    const stop = (!keep && collapsed.has(id)) || (compactActive && (depth >= 1 || id === UNASSIGNED_ID));
    if (stop) {
      kids.set(id, []);
      return;
    }
    const shown = keep ? children.filter((k) => keep.has(k)) : children;
    kids.set(id, shown);
    for (const child of shown) walk(child, depth + 1, id);
  };

  for (const root of roots) {
    if (keep && !keep.has(root)) continue;
    shownRoots.push(root);
    walk(root, 0, null);
  }
  return { nodes, kids, roots: shownRoots };
}
