import { test } from "node:test";
import assert from "node:assert/strict";
import { boundsOf, layoutTree, type LayoutDirection, type Rect } from "./network-layout";

const kids: Record<string, string[]> = {
  root: ["a", "b", "c"],
  a: ["a1", "a2"],
  b: [],
  c: ["c1"],
  a1: [],
  a2: [],
  c1: [],
  other: ["o1"],
  o1: [],
};
const size = () => ({ width: 100, height: 40 });

function run(direction: LayoutDirection, roots = ["root"]) {
  return layoutTree({ roots, kids: (id) => kids[id] ?? [], size, direction });
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test("layoutTree — no two cards overlap, in either direction", async (t) => {
  for (const direction of ["horizontal", "vertical"] as const) {
    await t.test(direction, () => {
      const rects = [...run(direction, ["root", "other"]).values()];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          assert.equal(overlaps(rects[i], rects[j]), false, `cards ${i} and ${j} overlap`);
        }
      }
    });
  }
});

test("layoutTree — each level is its own column, deeper levels further right", () => {
  const r = run("horizontal");
  assert.equal(r.get("root")!.x, 0);
  assert.ok(r.get("a")!.x > r.get("root")!.x);
  assert.equal(r.get("a")!.x, r.get("b")!.x);
  assert.ok(r.get("a1")!.x > r.get("a")!.x);
});

test("layoutTree — a parent is centred between its first and last child", () => {
  const r = run("horizontal");
  const mid = (r.get("a1")!.y + r.get("a2")!.y + r.get("a2")!.height) / 2;
  assert.equal(r.get("a")!.y + r.get("a")!.height / 2, mid);
});

test("layoutTree — vertical swaps the axes", () => {
  const r = run("vertical");
  assert.equal(r.get("root")!.y, 0);
  assert.ok(r.get("a")!.y > r.get("root")!.y);
  assert.equal(r.get("a")!.y, r.get("b")!.y);
});

test("layoutTree — separate trees are stacked with room between them", () => {
  const r = run("horizontal", ["root", "other"]);
  const first = boundsOf([...["root", "a", "b", "c", "a1", "a2", "c1"].map((id) => r.get(id)!)])!;
  assert.ok(r.get("other")!.y >= first.y + first.height);
});

test("boundsOf — empty is null, otherwise the enclosing box", () => {
  assert.equal(boundsOf([]), null);
  assert.deepEqual(
    boundsOf([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 5, width: 10, height: 10 },
    ]),
    { x: 0, y: 0, width: 30, height: 15 }
  );
});
