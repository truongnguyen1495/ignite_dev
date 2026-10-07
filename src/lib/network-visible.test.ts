import { test } from "node:test";
import assert from "node:assert/strict";
import { UNASSIGNED_ID, buildTree, type NetworkMemberLite } from "./network-tree";
import { ancestorsOfMatches, computeVisibleTree, defaultCollapsed } from "./network-visible";

function m(id: string, leaderId: string | null, extra: Partial<NetworkMemberLite> = {}): NetworkMemberLite {
  return { id, name: id.toUpperCase(), igniteId: null, status: "ACTIVE", team: null, isRoot: false, leaderId, referrerId: null, ...extra };
}

// ln
// ├── nhu ── an ── dung ── ngan        (depth 4)
// │          └─── em
// └── khang ── lan
// (unassigned) u1, u2
const tree = buildTree(
  [
    m("ln", null, { isRoot: true }),
    m("nhu", "ln"),
    m("khang", "ln"),
    m("an", "nhu"),
    m("dung", "an"),
    m("ngan", "dung", { status: "LEAD" }),
    m("em", "an"),
    m("lan", "khang"),
    m("u1", null),
    m("u2", null),
  ],
  "leader"
);

const ids = (v: { nodes: { id: string }[] }) => v.nodes.map((n) => n.id).sort();

test("defaultCollapsed — opens two levels, folds the rest and the bucket", () => {
  const folded = defaultCollapsed(tree);
  assert.ok(folded.has("an"), "depth 2 with children is folded");
  assert.ok(folded.has("dung"));
  assert.ok(folded.has(UNASSIGNED_ID));
  assert.ok(!folded.has("ln") && !folded.has("nhu") && !folded.has("khang"));
  assert.ok(!folded.has("lan"), "a leaf has nothing to fold");
});

test("computeVisibleTree — collapse hides descendants but keeps the node", () => {
  const v = computeVisibleTree({ tree, collapsed: defaultCollapsed(tree), compact: false, focusRoot: null, keep: null });
  assert.deepEqual(ids(v), ["an", "khang", "lan", "ln", "nhu", UNASSIGNED_ID].sort());
  assert.deepEqual(v.kids.get("an"), []);
  assert.deepEqual(v.roots, ["ln", UNASSIGNED_ID]);
});

test("computeVisibleTree — expanding a fold shows its children", () => {
  const folded = defaultCollapsed(tree);
  folded.delete("an");
  const v = computeVisibleTree({ tree, collapsed: folded, compact: false, focusRoot: null, keep: null });
  assert.ok(v.nodes.some((n) => n.id === "dung"));
  assert.ok(v.nodes.some((n) => n.id === "em"));
  assert.ok(!v.nodes.some((n) => n.id === "ngan"), "dung is still folded");
});

test("computeVisibleTree — compact mode keeps the top level and direct children", () => {
  const v = computeVisibleTree({ tree, collapsed: new Set(), compact: true, focusRoot: null, keep: null });
  assert.deepEqual(ids(v), ["khang", "ln", "nhu", UNASSIGNED_ID].sort());
  assert.deepEqual(v.kids.get(UNASSIGNED_ID), [], "the bucket is a card, not an expanded list");
});

test("computeVisibleTree — focusing a branch shows it as the whole tree, even in compact mode", () => {
  const v = computeVisibleTree({ tree, collapsed: new Set(), compact: true, focusRoot: "nhu", keep: null });
  assert.deepEqual(v.roots, ["nhu"]);
  assert.ok(v.nodes.some((n) => n.id === "ngan"));
  assert.ok(!v.nodes.some((n) => n.id === "khang"));
  assert.equal(v.nodes[0].parent, null);
});

test("ancestorsOfMatches + keep — only branches containing a result, folds ignored", () => {
  const keep = ancestorsOfMatches(tree, (id) => id === "ngan");
  assert.deepEqual([...keep].sort(), ["an", "dung", "ln", "ngan", "nhu"]);
  const v = computeVisibleTree({ tree, collapsed: defaultCollapsed(tree), compact: false, focusRoot: null, keep });
  assert.deepEqual(ids(v), ["an", "dung", "ln", "ngan", "nhu"]);
  assert.deepEqual(v.kids.get("an"), ["dung"], "em is pruned, dung is shown despite being folded by default");
});

test("ancestorsOfMatches — nothing matches means nothing is kept", () => {
  const keep = ancestorsOfMatches(tree, () => false);
  assert.equal(keep.size, 0);
  const v = computeVisibleTree({ tree, collapsed: new Set(), compact: false, focusRoot: null, keep });
  assert.deepEqual(v.nodes, []);
});

test("ancestorsOfMatches — the bucket itself never counts as a match", () => {
  const keep = ancestorsOfMatches(tree, () => true);
  assert.ok(keep.has("u1") && keep.has(UNASSIGNED_ID));
  assert.equal(keep.size, 10 + 1);
});
