import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSheetRows, planImport, type CellValue, type ExistingMember, type ImportRow, type Resolution } from "./network-import";

// The shape of the real sheet: a "TAT TUẦN" banner on row 1, headers on row 2,
// weekly target columns we ignore, people from row 3, and pre-formatted rows
// that carry only an STT number.
const HEADER: CellValue[] = ["STT", "Ho Ten", "TEAM", "REFERRAL", "IGNITE ID", "Lead/Active/Inactive/Customer", "Leader", "MỤC TIÊU\nBA/ĐƠN/TN", "KẾT QUẢ"];
function sheet(...people: CellValue[][]): CellValue[][] {
  return [[null, null, null, null, null, null, null, "TAT TUẦN 38", null], HEADER, ...people];
}
// person: [name, team, referral, id, status, leader]
function p(name: string, team: string | null, referral: string | null, id: string | null, status: string, leader: string | null): CellValue[] {
  return [1, name, team, referral, id, status, leader, "1 BA", "Done"];
}

function rowsOf(...people: CellValue[][]): ImportRow[] {
  return parseSheetRows(sheet(...people)).rows;
}

test("parseSheetRows", async (t) => {
  await t.test("finds the header under a banner row and reads only people", () => {
    const parsed = parseSheetRows(sheet(p("PHAM THIEU KHANG", null, null, null, "Lead", "LN"), [2, null, null, null, null, null, null, null, null], [3]));
    assert.deepEqual(parsed.missingColumns, []);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].name, "PHAM THIEU KHANG");
    assert.equal(parsed.rows[0].leaderRaw, "LN");
    assert.equal(parsed.rows[0].sourceRow, 3);
  });
  await t.test("collapses whitespace, uppercases the ID, turns '-' into nothing", () => {
    const [row] = rowsOf(p("  NGUYEN   THI  LAN ", "-", "-", " dia1234567 ", "Active", "-"));
    assert.equal(row.name, "NGUYEN THI LAN");
    assert.equal(row.team, null);
    assert.equal(row.igniteId, "DIA1234567");
    assert.equal(row.leaderRaw, "-");
  });
  await t.test("a sheet without a name column is unusable", () => {
    const parsed = parseSheetRows([["a", "b", "c"], [1, 2, 3]]);
    assert.deepEqual(parsed.rows, []);
    assert.deepEqual(parsed.missingColumns, ["Họ tên"]);
  });
  await t.test("a sheet missing Leader or status says which", () => {
    const parsed = parseSheetRows([["Ho Ten", "TEAM", "IGNITE ID"], ["A", "x", "DIA1234567"]]);
    assert.deepEqual(parsed.missingColumns, ["Trạng thái", "Leader"]);
  });
  await t.test("accepts the new product wording for the ID column", () => {
    const parsed = parseSheetRows([["Họ tên", "RapidX ID", "Trạng thái", "Leader"], ["A", "DIA1234567", "Lead", "LN"]]);
    assert.equal(parsed.rows[0].igniteId, "DIA1234567");
  });
});

test("planImport — the real file's patterns", async (t) => {
  const people = [
    p("PHAM THIEU KHANG", null, null, null, "Lead", "LN"),
    p("DINH HOAI VY", null, null, null, "Lead", "LN"),
    p("TRAN THI MAI", "G7-N3-Thuy", "HOAI VY", "DIA6000521", "Active", "DINH HOAI VY"),
    p("LE THI HONG", "KNV", "NGUYEN THI HONG THAM", "DIA8071599", "In-active", "PHAM THIEU KHANG"),
    p("NGUYỄN THỊ HỒNG THẮM", "KNV", "-", null, "0_PP", "-"),
    p("VO HUU LOC", "KNV", "Nobody Known", "DIA5593659", "Customer", "-"),
  ];
  const rows = rowsOf(...people);
  const plan = (resolutions: Record<string, Resolution> = {}, existing: ExistingMember[] = []) => planImport({ rows, existing, resolutions });

  await t.test("Leader 'LN' means the root, '-' means unassigned", () => {
    const r = plan();
    assert.equal(r.stats.leaderIsRoot, 2);
    assert.equal(r.stats.unassigned, 2);
    assert.equal(r.create.find((m) => m.name === "PHAM THIEU KHANG")!.leader, "root");
    assert.equal(r.create.find((m) => m.name === "VO HUU LOC")!.leader, null);
  });
  await t.test("the root is created when none exists, not when one does", () => {
    assert.equal(plan().createRoot, true);
    assert.equal(plan({}, [{ id: "r1", name: "LÊ NGUYÊN", igniteId: null, isRoot: true }]).createRoot, false);
  });
  await t.test("names match ignoring diacritics (HỒNG THẮM vs HONG THAM)", () => {
    const r = plan();
    const le = r.create.find((m) => m.name === "LE THI HONG")!;
    assert.equal(le.referrer, "row:4");
  });
  await t.test("an abbreviated name is unresolved, with the full name suggested", () => {
    const r = plan();
    const u = r.unresolved.find((x) => x.name === "HOAI VY")!;
    assert.equal(u.field, "referrer");
    assert.equal(u.rows, 1);
    assert.equal(u.suggestion?.label, "DINH HOAI VY");
    assert.equal(u.suggestion?.target, "row:1");
  });
  await t.test("a name found nowhere has no suggestion", () => {
    const u = plan().unresolved.find((x) => x.name === "Nobody Known")!;
    assert.equal(u.suggestion, null);
  });
  await t.test("not ready until every unresolved name has a choice", () => {
    assert.equal(plan().ready, false);
    const r = plan({ "referrer|HOAI VY": { kind: "member", target: "row:1" }, "referrer|NOBODY KNOWN": { kind: "blank" } });
    assert.equal(r.ready, true);
    assert.deepEqual(r.errors, []);
  });
  await t.test("'member' points the cell at the chosen person", () => {
    const r = plan({ "referrer|HOAI VY": { kind: "member", target: "row:1" }, "referrer|NOBODY KNOWN": { kind: "blank" } });
    assert.equal(r.create.find((m) => m.name === "TRAN THI MAI")!.referrer, "row:1");
    assert.equal(r.create.find((m) => m.name === "VO HUU LOC")!.referrer, null);
  });
  await t.test("'create' adds a new Customer with that name, unassigned", () => {
    const r = plan({ "referrer|HOAI VY": { kind: "blank" }, "referrer|NOBODY KNOWN": { kind: "create" } });
    const made = r.create.find((m) => m.key === "new:NOBODY KNOWN")!;
    assert.equal(made.name, "Nobody Known");
    assert.equal(made.status, "CUSTOMER");
    assert.equal(made.leader, null);
    assert.equal(r.create.find((m) => m.name === "VO HUU LOC")!.referrer, made.key);
    assert.equal(r.stats.createdFromNames, 1);
  });
  await t.test("a name unresolved in both columns creates one member, not two", () => {
    const both = planImport({
      rows: rowsOf(
        p("A", null, "Ghost Person", null, "Active", "-"),
        p("B", null, "-", null, "Active", "GHOST PERSON")
      ),
      existing: [],
      resolutions: { "referrer|GHOST PERSON": { kind: "create" }, "leader|GHOST PERSON": { kind: "create" } },
    });
    assert.equal(both.create.filter((m) => m.name.toUpperCase() === "GHOST PERSON").length, 1);
    assert.equal(both.stats.createdFromNames, 1);
    const made = both.create.find((m) => m.key === "new:GHOST PERSON")!;
    assert.equal(both.create.find((m) => m.name === "A")!.referrer, made.key);
    assert.equal(both.create.find((m) => m.name === "B")!.leader, made.key);
  });
  await t.test("counts rows without a RapidX ID", () => {
    assert.equal(plan().stats.missingId, 3);
  });
  await t.test("a choice pointing at someone who is not in the file is rejected", () => {
    const r = plan({ "referrer|HOAI VY": { kind: "member", target: "row:999" }, "referrer|NOBODY KNOWN": { kind: "blank" } });
    assert.ok(r.errors.some((e) => /không hợp lệ/.test(e.message)));
    assert.equal(r.ready, false);
  });
});

test("planImport — things that must block the import", async (t) => {
  const plan = (people: CellValue[][], existing: ExistingMember[] = []) =>
    planImport({ rows: rowsOf(...people), existing, resolutions: {} });

  await t.test("a malformed RapidX ID", () => {
    const r = plan([p("A", null, null, "DIA12", "Active", "-")]);
    assert.ok(r.errors.some((e) => /DIA \+ 7/.test(e.message)));
    assert.equal(r.create.length, 0);
  });
  await t.test("the same RapidX ID on two rows", () => {
    const r = plan([p("A", null, null, "DIA1234567", "Active", "-"), p("B", null, null, "DIA1234567", "Active", "-")]);
    assert.ok(r.errors.some((e) => /trùng với dòng 3/.test(e.message)));
  });
  await t.test("two rows with the same name, since relations are by name", () => {
    const r = plan([p("Nguyễn Văn A", null, null, null, "Active", "-"), p("NGUYEN VAN A", null, null, null, "Active", "-")]);
    assert.ok(r.errors.some((e) => /trùng tên/.test(e.message)));
  });
  await t.test("an unrecognised or missing status", () => {
    assert.ok(plan([p("A", null, null, null, "Partner", "-")]).errors.some((e) => /không nhận ra/.test(e.message)));
    assert.ok(plan([p("A", null, null, null, "", "-")]).errors.some((e) => /thiếu trạng thái/.test(e.message)));
  });
  await t.test("someone listed as their own leader", () => {
    const r = plan([p("A", null, null, null, "Active", "A")]);
    assert.ok(r.errors.some((e) => /chính mình/.test(e.message)));
  });
  await t.test("a Leader loop (A → B → A)", () => {
    const r = plan([p("A", null, null, null, "Active", "B"), p("B", null, null, null, "Active", "A")]);
    assert.ok(r.errors.some((e) => /Vòng lặp Leader/.test(e.message)));
    assert.equal(r.ready, false);
  });
  await t.test("a referral loop is caught separately from the leader tree", () => {
    const r = plan([p("A", null, "B", null, "Active", "-"), p("B", null, "A", null, "Active", "-")]);
    assert.ok(r.errors.some((e) => /Vòng lặp người giới thiệu/.test(e.message)));
  });
  await t.test("a RapidX ID that already belongs to a different stored person", () => {
    const r = plan([p("A", null, null, "DIA1234567", "Active", "-")], [{ id: "x", name: "SOMEONE ELSE", igniteId: "DIA1234567", isRoot: false }]);
    assert.ok(r.errors.some((e) => /đã thuộc về SOMEONE ELSE/.test(e.message)));
  });
});

test("planImport — people already in the system are skipped, not overwritten", async (t) => {
  const existing: ExistingMember[] = [{ id: "db1", name: "NGUYỄN VĂN A", igniteId: "DIA1111111", isRoot: false }];
  const r = planImport({
    rows: rowsOf(p("NGUYEN VAN A", null, null, null, "Lead", "-"), p("B", null, "Nguyễn Văn A", null, "Active", "-")),
    existing,
    resolutions: {},
  });
  await t.test("the stored person is skipped with a reason", () => {
    assert.equal(r.skipped.length, 1);
    assert.equal(r.skipped[0].name, "NGUYEN VAN A");
  });
  await t.test("only the new person is created", () => {
    assert.deepEqual(r.create.map((m) => m.name), ["B"]);
  });
  await t.test("a new person can still point at the stored one", () => {
    assert.equal(r.create[0].referrer, "db:db1");
  });
  await t.test("importing the same file twice creates nothing the second time", () => {
    const rows = rowsOf(p("A", null, null, "DIA1234567", "Active", "-"), p("B", null, "A", null, "Active", "A"));
    const second = planImport({
      rows,
      existing: [
        { id: "1", name: "A", igniteId: "DIA1234567", isRoot: false },
        { id: "2", name: "B", igniteId: null, isRoot: false },
      ],
      resolutions: {},
    });
    assert.equal(second.create.length, 0);
    assert.equal(second.skipped.length, 2);
    assert.equal(second.ready, true);
  });
});

test("planImport — an empty file plans nothing and is trivially ready", () => {
  const r = planImport({ rows: [], existing: [], resolutions: {} });
  assert.equal(r.create.length, 0);
  assert.equal(r.ready, true);
});
