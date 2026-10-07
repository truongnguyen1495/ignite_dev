import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPatch, inversePatch } from "./network-patch";
import type { NetworkMemberLite } from "./network-tree";

function m(id: string, leaderId: string | null = null): NetworkMemberLite {
  return { id, name: id, igniteId: null, status: "ACTIVE", team: null, isRoot: false, leaderId, referrerId: null };
}

const list = [m("a"), m("b", "a"), m("c", "a")];

test("applyPatch — replaces in place, appends new, removes", () => {
  const next = applyPatch(list, { upsert: [m("b", null), m("d")], remove: ["c"] });
  assert.deepEqual(next.map((x) => x.id), ["a", "b", "d"]);
  assert.equal(next[1].leaderId, null);
});

test("applyPatch — does not mutate its input", () => {
  const before = JSON.stringify(list);
  applyPatch(list, { remove: ["a"] });
  assert.equal(JSON.stringify(list), before);
});

test("inversePatch undoes an edit, a creation and a deletion", async (t) => {
  await t.test("edit", () => {
    const patch = { upsert: [m("b", null)] };
    assert.deepEqual(applyPatch(applyPatch(list, patch), inversePatch(list, patch)), list);
  });
  await t.test("creation is undone by removing the new row", () => {
    const patch = { upsert: [m("z")] };
    assert.deepEqual(inversePatch(list, patch), { upsert: [], remove: ["z"] });
    assert.deepEqual(applyPatch(applyPatch(list, patch), inversePatch(list, patch)), list);
  });
  await t.test("deletion that also re-parents the downline", () => {
    const patch = { remove: ["a"], upsert: [m("b", null), m("c", null)] };
    const undone = applyPatch(applyPatch(list, patch), inversePatch(list, patch));
    assert.deepEqual(undone.map((x) => x.id).sort(), ["a", "b", "c"]);
    assert.equal(undone.find((x) => x.id === "b")!.leaderId, "a");
  });
});

test("an undo restores only its own rows, not other edits made meanwhile", () => {
  const first = { upsert: [m("b", null)] };
  const undo = inversePatch(list, first);
  const afterFirst = applyPatch(list, first);
  // A second edit lands while the first is still in flight...
  const afterSecond = applyPatch(afterFirst, { upsert: [m("c", null)] });
  // ...then the first is rejected and rolled back.
  const rolledBack = applyPatch(afterSecond, undo);
  assert.equal(rolledBack.find((x) => x.id === "b")!.leaderId, "a", "first edit undone");
  assert.equal(rolledBack.find((x) => x.id === "c")!.leaderId, null, "second edit kept");
});
