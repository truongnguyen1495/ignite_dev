import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assignLeaderSchema,
  changeStatusSchema,
  commitImportSchema,
  createMemberSchema,
  deleteMembersSchema,
  firstIssue,
  MAX_IMPORT_ROWS,
  patchMemberSchema,
} from "./network-schemas";

const base = { name: "NGUYỄN VĂN A", igniteId: "dia1234567", team: "G7-N1-An", leaderId: "l1", referrerId: "r1", status: "ACTIVE" };

test("createMemberSchema", async (t) => {
  await t.test("accepts a full member and normalises the RapidX ID to uppercase", () => {
    const r = createMemberSchema.safeParse(base);
    assert.ok(r.success);
    assert.equal(r.data.igniteId, "DIA1234567");
    assert.equal(r.data.leaderId, "l1");
  });
  await t.test("blank optional fields become null", () => {
    const r = createMemberSchema.safeParse({ ...base, igniteId: "  ", team: "", leaderId: "", referrerId: null });
    assert.ok(r.success);
    assert.deepEqual([r.data.igniteId, r.data.team, r.data.leaderId, r.data.referrerId], [null, null, null, null]);
  });
  await t.test("missing optional fields are fine", () => {
    const r = createMemberSchema.safeParse({ name: "A", status: "LEAD" });
    assert.ok(r.success);
    assert.equal(r.data.team, null);
  });
  await t.test("trims the name and refuses an empty one", () => {
    const ok = createMemberSchema.safeParse({ ...base, name: "  A  " });
    assert.ok(ok.success && ok.data.name === "A");
    const bad = createMemberSchema.safeParse({ ...base, name: "   " });
    assert.ok(!bad.success);
    assert.equal(firstIssue(bad.error), "Hãy nhập họ tên.");
  });
  await t.test("rejects an over-long name, team and ID", () => {
    assert.ok(!createMemberSchema.safeParse({ ...base, name: "x".repeat(121) }).success);
    const team = createMemberSchema.safeParse({ ...base, team: "x".repeat(61) });
    assert.ok(!team.success);
    assert.match(firstIssue(team.error), /Team tối đa 60/);
    assert.ok(!createMemberSchema.safeParse({ ...base, igniteId: "D".repeat(21) }).success);
  });
  await t.test("rejects an unknown status", () => {
    assert.ok(!createMemberSchema.safeParse({ ...base, status: "PARTNER" }).success);
  });
});

test("patchMemberSchema", async (t) => {
  await t.test("keeps only the fields that were sent", () => {
    const r = patchMemberSchema.safeParse({ id: "m1", team: "G7-N1" });
    assert.ok(r.success);
    assert.deepEqual(r.data, { id: "m1", team: "G7-N1" });
  });
  await t.test("a blank or null value clears the field; an absent one is left alone", () => {
    const r = patchMemberSchema.safeParse({ id: "m1", igniteId: "  ", team: null, leaderId: "", referrerId: null });
    assert.ok(r.success);
    assert.deepEqual(r.data, { id: "m1", igniteId: null, team: null, leaderId: null, referrerId: null });
  });
  await t.test("trims the name, uppercases the RapidX ID", () => {
    const r = patchMemberSchema.safeParse({ id: "m1", name: "  NGUYỄN A ", igniteId: "dia1234567" });
    assert.ok(r.success);
    assert.deepEqual(r.data, { id: "m1", name: "NGUYỄN A", igniteId: "DIA1234567" });
  });
  await t.test("refuses an empty name, an over-long field, a missing id, and a patch that changes nothing", () => {
    assert.ok(!patchMemberSchema.safeParse({ id: "m1", name: "   " }).success);
    assert.ok(!patchMemberSchema.safeParse({ id: "m1", name: "x".repeat(121) }).success);
    assert.ok(!patchMemberSchema.safeParse({ id: "m1", team: "x".repeat(61) }).success);
    assert.ok(!patchMemberSchema.safeParse({ id: "m1", igniteId: "D".repeat(21) }).success);
    assert.ok(!patchMemberSchema.safeParse({ team: "G7" }).success);
    assert.ok(!patchMemberSchema.safeParse({ id: "", team: "G7" }).success);
    const none = patchMemberSchema.safeParse({ id: "m1" });
    assert.ok(!none.success);
    assert.equal(firstIssue(none.error), "Không có thay đổi nào để lưu.");
  });
});

test("deleteMembersSchema — one to five hundred people", () => {
  assert.ok(deleteMembersSchema.safeParse({ ids: ["a", "b"] }).success);
  assert.ok(!deleteMembersSchema.safeParse({ ids: [] }).success);
  assert.ok(!deleteMembersSchema.safeParse({ ids: Array.from({ length: 501 }, (_, i) => `m${i}`) }).success);
  assert.ok(!deleteMembersSchema.safeParse({ ids: [""] }).success);
});

test("changeStatusSchema", async (t) => {
  const ok = { id: "m1", toStatus: "LEAD", effectiveDate: "2026-10-07", reason: "Đủ tiêu chuẩn Leader." };
  await t.test("accepts a valid change", () => {
    assert.ok(changeStatusSchema.safeParse(ok).success);
  });
  await t.test("an empty reason becomes null", () => {
    const r = changeStatusSchema.safeParse({ ...ok, reason: "  " });
    assert.ok(r.success && r.data.reason === null);
  });
  await t.test("refuses a malformed date and a date that is not on the calendar", () => {
    assert.ok(!changeStatusSchema.safeParse({ ...ok, effectiveDate: "07/10/2026" }).success);
    assert.ok(!changeStatusSchema.safeParse({ ...ok, effectiveDate: "2026-02-31" }).success);
    assert.ok(!changeStatusSchema.safeParse({ ...ok, effectiveDate: "2026-13-01" }).success);
    assert.ok(changeStatusSchema.safeParse({ ...ok, effectiveDate: "2028-02-29" }).success, "a real leap day");
    assert.ok(!changeStatusSchema.safeParse({ ...ok, effectiveDate: "2026-02-29" }).success, "not a leap year");
  });
  await t.test("refuses a reason over 1000 characters", () => {
    assert.ok(!changeStatusSchema.safeParse({ ...ok, reason: "x".repeat(1001) }).success);
  });
});

test("assignLeaderSchema — one to five hundred people", () => {
  assert.ok(assignLeaderSchema.safeParse({ ids: ["a"], leaderId: "l" }).success);
  assert.ok(!assignLeaderSchema.safeParse({ ids: [], leaderId: "l" }).success);
  assert.ok(!assignLeaderSchema.safeParse({ ids: Array.from({ length: 501 }, (_, i) => `m${i}`), leaderId: "l" }).success);
  assert.ok(!assignLeaderSchema.safeParse({ ids: ["a"], leaderId: "" }).success);
});

test("commitImportSchema", async (t) => {
  const row = { index: 0, sourceRow: 3, name: "A", team: null, igniteId: null, statusRaw: "Active", leaderRaw: "LN", referrerRaw: null };
  await t.test("accepts rows with all three resolution kinds", () => {
    const r = commitImportSchema.safeParse({
      rows: [row],
      resolutions: { "referrer|X": { kind: "member", target: "row:0" }, "referrer|Y": { kind: "blank" }, "leader|Z": { kind: "create" } },
    });
    assert.ok(r.success);
  });
  await t.test("refuses an empty file, an unknown resolution and a missing field", () => {
    assert.ok(!commitImportSchema.safeParse({ rows: [], resolutions: {} }).success);
    assert.ok(!commitImportSchema.safeParse({ rows: [row], resolutions: { k: { kind: "delete" } } }).success);
    assert.ok(!commitImportSchema.safeParse({ rows: [{ ...row, name: undefined }], resolutions: {} }).success);
  });
  await t.test("caps one import at MAX_IMPORT_ROWS rows", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ ...row, index: i, sourceRow: i + 3, name: `P${i}` }));
    assert.ok(commitImportSchema.safeParse({ rows: many(MAX_IMPORT_ROWS), resolutions: {} }).success);
    const over = commitImportSchema.safeParse({ rows: many(MAX_IMPORT_ROWS + 1), resolutions: {} });
    assert.ok(!over.success);
    assert.equal(firstIssue(over.error), "Tối đa 2.000 dòng một lần.");
  });
});
