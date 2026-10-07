import { test } from "node:test";
import assert from "node:assert/strict";
import type { NetworkMemberLite } from "./network-tree";
import {
  changedFields,
  clampPage,
  pageCount,
  pageOfIndex,
  sortMembers,
  visiblePages,
  visibleSelection,
  type SortKey,
} from "./network-table";

const m = (id: string, name: string, over: Partial<NetworkMemberLite> = {}): NetworkMemberLite => ({
  id,
  name,
  igniteId: null,
  status: "ACTIVE",
  team: null,
  isRoot: false,
  leaderId: null,
  referrerId: null,
  ...over,
});

const list = [
  m("root", "LN", { isRoot: true, status: "LEAD" }),
  m("b", "BÌNH", { leaderId: "root", status: "CUSTOMER" }),
  m("a", "AN", { leaderId: "b", status: "LEAD" }),
  m("c", "CƯỜNG", { leaderId: "root", status: "ACTIVE" }),
  m("d", "DŨNG", { status: "ZERO_PP" }), // no leader
];
const byId = new Map(list.map((x) => [x.id, x]));
const downs: Record<string, number> = { root: 4, b: 1, a: 0, c: 0, d: 0 };
const ctx = { byId, branchOf: (x: NetworkMemberLite) => (x.leaderId === "root" ? x.name : x.isRoot ? "Gốc" : "Chưa gán"), downline: (id: string) => downs[id] };
const names = (key: SortKey, dir: 1 | -1) => sortMembers(list, { key, dir }, ctx).map((x) => x.name);

test("sortMembers", async (t) => {
  await t.test("by name, both ways, with Vietnamese collation", () => {
    assert.deepEqual(names("name", 1), ["AN", "BÌNH", "CƯỜNG", "DŨNG", "LN"]);
    assert.deepEqual(names("name", -1), ["LN", "DŨNG", "CƯỜNG", "BÌNH", "AN"]);
  });
  await t.test("by status follows the funnel order, ties by name", () => {
    assert.deepEqual(names("status", 1), ["AN", "LN", "CƯỜNG", "DŨNG", "BÌNH"]);
  });
  await t.test("by downline", () => {
    assert.deepEqual(names("downline", -1), ["LN", "BÌNH", "AN", "CƯỜNG", "DŨNG"]);
  });
  await t.test("by leader puts the people with none last, in either direction", () => {
    const asc = names("leader", 1);
    const desc = names("leader", -1);
    assert.equal(asc[asc.length - 2], "DŨNG");
    assert.equal(desc[desc.length - 2], "DŨNG");
  });
  await t.test("by branch uses the branch name shown", () => {
    assert.equal(names("branch", 1)[0], "BÌNH");
  });
  await t.test("does not change the list it was given", () => {
    const before = list.map((x) => x.id).join();
    sortMembers(list, { key: "status", dir: -1 }, ctx);
    assert.equal(list.map((x) => x.id).join(), before);
  });
});

test("paging", async (t) => {
  await t.test("pageCount is at least one page", () => {
    assert.equal(pageCount(0, 25), 1);
    assert.equal(pageCount(25, 25), 1);
    assert.equal(pageCount(26, 25), 2);
    assert.equal(pageCount(124, 25), 5);
  });
  await t.test("pageOfIndex is 1-based", () => {
    assert.equal(pageOfIndex(0, 25), 1);
    assert.equal(pageOfIndex(24, 25), 1);
    assert.equal(pageOfIndex(25, 25), 2);
  });
  await t.test("clampPage keeps the page inside the range after rows disappear", () => {
    assert.equal(clampPage(9, 30, 25), 2);
    assert.equal(clampPage(0, 30, 25), 1);
    assert.equal(clampPage(2, 0, 25), 1);
  });
  await t.test("visiblePages shows the ends and the neighbourhood, with gaps", () => {
    assert.deepEqual(visiblePages(1, 5), [1, 2, "gap", 5]);
    assert.deepEqual(visiblePages(3, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(visiblePages(10, 20), [1, "gap", 9, 10, 11, "gap", 20]);
    assert.deepEqual(visiblePages(1, 1), [1]);
  });
});

test("changedFields", async (t) => {
  const person = m("p", "NGUYỄN A", { igniteId: "DIA1234567", team: "G7", leaderId: "l1", referrerId: "r1" });
  const same = { name: "NGUYỄN A", igniteId: "DIA1234567", team: "G7", leaderId: "l1", referrerId: "r1" };
  await t.test("nothing changed means nothing to send", () => {
    assert.deepEqual(changedFields(person, same), {});
  });
  await t.test("only the changed fields come back", () => {
    assert.deepEqual(changedFields(person, { ...same, team: "G8" }), { team: "G8" });
    assert.deepEqual(changedFields(person, { ...same, igniteId: null, referrerId: null }), { igniteId: null, referrerId: null });
  });
  await t.test("a leader change is reported, the root's leader is not", () => {
    assert.deepEqual(changedFields(person, { ...same, leaderId: null }), { leaderId: null });
    const root = m("root", "LN", { isRoot: true });
    assert.deepEqual(changedFields(root, { name: "LN", igniteId: null, team: null, leaderId: "x", referrerId: null }), {});
  });
});

test("visibleSelection keeps only ticked rows that are still shown, and never the root", () => {
  const picked = new Set(["a", "b", "d", "root", "gone"]);
  const shown = [list[0], list[2], list[4]]; // root, a, d — b is filtered out
  assert.deepEqual(visibleSelection(picked, shown), ["a", "d"]);
  assert.deepEqual(visibleSelection(new Set(), shown), []);
});
