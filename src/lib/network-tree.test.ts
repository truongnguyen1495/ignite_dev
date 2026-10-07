import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNASSIGNED_ID,
  buildTree,
  chainTo,
  computeBranchHeads,
  descendantIds,
  distinctTeams,
  foldName,
  isValidIgniteId,
  matchesSearch,
  wouldCreateCycle,
  type NetworkMemberLite,
} from "./network-tree";
import { NETWORK_STATUS_CONFIG, NETWORK_STATUS_ORDER, parseNetworkStatus } from "./network-status";

function m(
  id: string,
  leaderId: string | null,
  referrerId: string | null = null,
  extra: Partial<NetworkMemberLite> = {}
): NetworkMemberLite {
  return { id, name: id.toUpperCase(), igniteId: null, status: "ACTIVE", team: null, isRoot: false, leaderId, referrerId, ...extra };
}

// LN (root)
// ├── NHU ── A ── A1, A2          (A1 referred by B, a different branch)
// ├── KHANG ── B
// └── (unassigned) U1, U2 ── U3   (U3 sits under U2)
const members: NetworkMemberLite[] = [
  m("ln", null, null, { isRoot: true, status: "LEAD" }),
  m("nhu", "ln", "ln", { status: "LEAD" }),
  m("khang", "ln", "ln", { status: "LEAD" }),
  m("a", "nhu", "nhu"),
  m("a1", "a", "b", { status: "ZERO_PP" }),
  m("a2", "a", "a", { status: "CUSTOMER" }),
  m("b", "khang", "khang", { status: "INACTIVE" }),
  m("u1", null, "a", { status: "CUSTOMER" }),
  m("u2", null, null, { status: "CUSTOMER" }),
  m("u3", "u2", "u2", { status: "ZERO_PP" }),
];
const byId = new Map(members.map((x) => [x.id, x]));

test("foldName — case, marks and spacing do not distinguish people", async (t) => {
  await t.test("strips Vietnamese diacritics including đ", () => {
    assert.equal(foldName("Nguyễn Thị Việt Ngân"), "NGUYEN THI VIET NGAN");
    assert.equal(foldName("Đặng Đình Đức"), "DANG DINH DUC");
  });
  await t.test("collapses and trims whitespace", () => {
    assert.equal(foldName("  nguyen   thi  \n lan "), "NGUYEN THI LAN");
  });
});

test("isValidIgniteId — DIA followed by exactly seven digits", () => {
  assert.equal(isValidIgniteId("DIA6045810"), true);
  assert.equal(isValidIgniteId("DIA604581"), false);
  assert.equal(isValidIgniteId("DIA60458100"), false);
  assert.equal(isValidIgniteId("dia6045810"), false);
  assert.equal(isValidIgniteId("XYZ6045810"), false);
});

test("buildTree — Organization (leader) relation", async (t) => {
  const tree = buildTree(members, "leader");

  await t.test("root first, unassigned bucket last", () => {
    assert.deepEqual(tree.roots, ["ln", UNASSIGNED_ID]);
  });
  await t.test("children are sorted by name", () => {
    assert.deepEqual(tree.kids.get("ln"), ["khang", "nhu"]);
    assert.deepEqual(tree.kids.get("a"), ["a1", "a2"]);
  });
  await t.test("members with no leader land in the bucket, the root does not", () => {
    assert.deepEqual(tree.kids.get(UNASSIGNED_ID), ["u1", "u2"]);
    assert.ok(!tree.kids.get(UNASSIGNED_ID)!.includes("ln"));
  });
  await t.test("descendant counts include every depth", () => {
    assert.equal(tree.descendants.get("ln"), 6);
    assert.equal(tree.descendants.get("nhu"), 3);
    assert.equal(tree.descendants.get("a"), 2);
    assert.equal(tree.descendants.get("a1"), 0);
    assert.equal(tree.descendants.get(UNASSIGNED_ID), 3);
  });
  await t.test("subtree status counts include the node itself, not the bucket", () => {
    const ln = tree.stats.get("ln")!;
    assert.equal(ln.total, 7);
    assert.equal(ln.LEAD, 3);
    assert.equal(ln.ZERO_PP, 1);
    assert.equal(tree.stats.get(UNASSIGNED_ID)!.total, 3);
  });
  await t.test("nothing is unreachable in clean data", () => {
    assert.deepEqual(tree.unreachable, []);
  });
});

test("buildTree — Referral relation is independent of the Leader tree", async (t) => {
  const tree = buildTree(members, "referrer");
  await t.test("no unassigned bucket; roots are people nobody referred", () => {
    assert.ok(!tree.roots.includes(UNASSIGNED_ID));
    assert.deepEqual(tree.roots, ["ln", "u2"]);
  });
  await t.test("A1 is under B here although its leader is A", () => {
    assert.ok(tree.kids.get("b")!.includes("a1"));
    assert.ok(!tree.kids.get("a")!.includes("a1"));
  });
});

test("buildTree — stored data holding a cycle is reported, never looped on", () => {
  const cyclic = [m("r", null, null, { isRoot: true }), m("x", "y"), m("y", "x")];
  const tree = buildTree(cyclic, "leader");
  assert.deepEqual(tree.unreachable.sort(), ["x", "y"]);
});

test("buildTree — a dangling parent id is treated as no parent", () => {
  const tree = buildTree([m("r", null, null, { isRoot: true }), m("z", "ghost")], "leader");
  assert.deepEqual(tree.kids.get(UNASSIGNED_ID), ["z"]);
});

test("chainTo — ancestors top-down, bucket first for the unassigned", () => {
  assert.deepEqual(chainTo(byId, "leader", "a1"), ["ln", "nhu", "a", "a1"]);
  assert.deepEqual(chainTo(byId, "leader", "u3"), [UNASSIGNED_ID, "u2", "u3"]);
  assert.deepEqual(chainTo(byId, "leader", "ln"), ["ln"]);
  assert.deepEqual(chainTo(byId, "referrer", "a1"), ["ln", "khang", "b", "a1"]);
  assert.deepEqual(chainTo(byId, "leader", UNASSIGNED_ID), [UNASSIGNED_ID]);
});

test("computeBranchHeads — the ancestor whose leader is the root", () => {
  const heads = computeBranchHeads(members);
  assert.equal(heads.get("a1"), "nhu");
  assert.equal(heads.get("nhu"), "nhu");
  assert.equal(heads.get("b"), "khang");
  assert.equal(heads.get("ln"), null);
  assert.equal(heads.get("u1"), null);
  assert.equal(heads.get("u3"), null);
});

test("computeBranchHeads — moving someone moves their branch with them", () => {
  const moved = members.map((x) => (x.id === "a" ? { ...x, leaderId: "khang" } : x));
  const heads = computeBranchHeads(moved);
  assert.equal(heads.get("a"), "khang");
  assert.equal(heads.get("a1"), "khang");
});

test("wouldCreateCycle", async (t) => {
  await t.test("a member cannot be their own parent", () => {
    assert.equal(wouldCreateCycle(byId, "leader", "a", "a"), true);
  });
  await t.test("a descendant cannot become the parent", () => {
    assert.equal(wouldCreateCycle(byId, "leader", "nhu", "a1"), true);
  });
  await t.test("a sibling branch is fine", () => {
    assert.equal(wouldCreateCycle(byId, "leader", "a", "khang"), false);
  });
  await t.test("no parent (unassigned) is always fine", () => {
    assert.equal(wouldCreateCycle(byId, "leader", "a", null), false);
  });
  await t.test("the two relations are checked separately", () => {
    // In the Leader tree b is not under a1, but in the Referral tree a1 is under b.
    assert.equal(wouldCreateCycle(byId, "leader", "b", "a1"), false);
    assert.equal(wouldCreateCycle(byId, "referrer", "b", "a1"), true);
  });
});

test("descendantIds", () => {
  const tree = buildTree(members, "leader");
  assert.deepEqual(descendantIds(tree.kids, "nhu").sort(), ["a", "a1", "a2"]);
  assert.deepEqual(descendantIds(tree.kids, "a1"), []);
});

test("matchesSearch — name ignoring marks, or RapidX ID", () => {
  const person = m("p", null, null, { name: "NGUYỄN THỊ VIỆT NGÂN", igniteId: "DIA9166823" });
  assert.equal(matchesSearch(person, foldName("viet ngan")), true);
  assert.equal(matchesSearch(person, foldName("việt ngân")), true);
  assert.equal(matchesSearch(person, "DIA9166"), true);
  assert.equal(matchesSearch(person, foldName("khang")), false);
  assert.equal(matchesSearch(person, ""), true);
});

test("distinctTeams — unique, sorted, nulls dropped", () => {
  const list = [m("1", null, null, { team: "KNV" }), m("2", null, null, { team: "G7-N1-An" }), m("3", null, null, { team: "KNV" }), m("4", null)];
  assert.deepEqual(distinctTeams(list), ["G7-N1-An", "KNV"]);
});

test("parseNetworkStatus — the spreadsheet's spellings", async (t) => {
  await t.test("every spelling in the source file", () => {
    assert.equal(parseNetworkStatus("Lead"), "LEAD");
    assert.equal(parseNetworkStatus("Active"), "ACTIVE");
    assert.equal(parseNetworkStatus("In-active"), "INACTIVE");
    assert.equal(parseNetworkStatus("0_PP"), "ZERO_PP");
    assert.equal(parseNetworkStatus("Customer"), "CUSTOMER");
  });
  await t.test("case and separators do not matter", () => {
    assert.equal(parseNetworkStatus("in active"), "INACTIVE");
    assert.equal(parseNetworkStatus("INACTIVE"), "INACTIVE");
    assert.equal(parseNetworkStatus(" 0 pp "), "ZERO_PP");
  });
  await t.test("unknown or empty is null, never a guess", () => {
    assert.equal(parseNetworkStatus("Partner"), null);
    assert.equal(parseNetworkStatus(""), null);
    assert.equal(parseNetworkStatus(null), null);
  });
  await t.test("every status has a label and colour", () => {
    for (const s of NETWORK_STATUS_ORDER) {
      assert.ok(NETWORK_STATUS_CONFIG[s].label.length > 0);
      assert.ok(NETWORK_STATUS_CONFIG[s].pill.includes("text-"));
    }
  });
});
