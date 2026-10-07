// Turning the team spreadsheet into Team Network members. Two pure steps so
// both the browser (live preview as the admin makes choices) and the Server
// Action (the authoritative re-check before anything is written) run exactly
// the same code:
//
//   parseSheetRows  a sheet's cells  ->  typed rows  (header detection, trimming)
//   planImport      rows + who already exists + the admin's choices  ->  a plan
//
// Reading the .xlsx file itself needs Node, so that lives in
// network-import-read.ts. Nothing here touches the database.
import { parseNetworkStatus, type NetworkStatus } from "./network-status";
import { foldName, isValidIgniteId } from "./network-tree";

export type CellValue = string | number | boolean | Date | null | undefined;

export type ImportRow = {
  /** 0-based position among the sheet's data rows, the key other things point at. */
  index: number;
  /** 1-based spreadsheet row number, for messages the admin can find in Excel. */
  sourceRow: number;
  name: string;
  team: string | null;
  igniteId: string | null;
  statusRaw: string | null;
  leaderRaw: string | null;
  referrerRaw: string | null;
};

export type ParsedSheet = {
  rows: ImportRow[];
  /** Column titles the sheet needs and does not have. Non-empty means unusable. */
  missingColumns: string[];
};

// "LN" is how the source spreadsheet names the top of the network in the
// Leader column. It has no row of its own, so it always means the root.
const ROOT_ALIASES = new Set(["LN"]);

// Cell contents that mean "nobody" rather than a person's name.
const EMPTY_TOKENS = new Set(["", "-", "--", "—", "N/A", "NA", "KHONG", "NONE", "NULL"]);

const HEADER_SCAN_ROWS = 15;

function squash(value: string): string {
  return foldName(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, " ").trim();
}

type ColumnKey = "name" | "team" | "referrer" | "igniteId" | "status" | "leader";

function classifyHeader(header: string): ColumnKey | null {
  const s = squash(header);
  if (!s) return null;
  if (["hoten", "hovaten", "ten", "name", "fullname"].includes(s)) return "name";
  if (s === "team") return "team";
  if (["referral", "referrer", "nguoigioithieu"].includes(s)) return "referrer";
  if (["igniteid", "rapidxid", "radpixid", "id", "mathanhvien"].includes(s)) return "igniteId";
  if (s === "leader") return "leader";
  // The source sheet titles its status column "Lead/Active/Inactive/Customer".
  if (["status", "trangthai"].includes(s) || (s.includes("lead") && s.includes("active"))) return "status";
  return null;
}

// Finds the header row (the file has a "TAT TUẦN 38…" banner above it) and
// reads every row below it that has a name. Rows with only an STT number and
// nothing else — the sheet is pre-formatted well past its last person — are
// skipped. The weekly TAT columns are ignored on purpose.
export function parseSheetRows(table: readonly (readonly CellValue[])[]): ParsedSheet {
  let headerRow = -1;
  let columns = new Map<ColumnKey, number>();
  for (let r = 0; r < Math.min(table.length, HEADER_SCAN_ROWS); r++) {
    const found = new Map<ColumnKey, number>();
    table[r].forEach((cell, c) => {
      const key = classifyHeader(cellText(cell));
      if (key && !found.has(key)) found.set(key, c);
    });
    if (found.has("name") && found.size >= 3) {
      headerRow = r;
      columns = found;
      break;
    }
  }

  if (headerRow < 0) return { rows: [], missingColumns: ["Họ tên"] };

  const missingColumns: string[] = [];
  if (!columns.has("status")) missingColumns.push("Trạng thái");
  if (!columns.has("leader")) missingColumns.push("Leader");
  if (missingColumns.length > 0) return { rows: [], missingColumns };

  const get = (row: readonly CellValue[], key: ColumnKey): string => {
    const c = columns.get(key);
    return c === undefined ? "" : cellText(row[c]);
  };
  const orNull = (v: string): string | null => (EMPTY_TOKENS.has(v.toUpperCase()) ? null : v);

  const rows: ImportRow[] = [];
  for (let r = headerRow + 1; r < table.length; r++) {
    const name = get(table[r], "name");
    if (!name) continue;
    rows.push({
      index: rows.length,
      sourceRow: r + 1,
      name,
      team: orNull(get(table[r], "team")),
      igniteId: orNull(get(table[r], "igniteId"))?.toUpperCase() ?? null,
      statusRaw: get(table[r], "status") || null,
      leaderRaw: get(table[r], "leader") || null,
      referrerRaw: get(table[r], "referrer") || null,
    });
  }
  return { rows, missingColumns: [] };
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export type ExistingMember = { id: string; name: string; igniteId: string | null; isRoot: boolean };

// What the admin chose for a name that matches nobody:
//   member  point it at a person (a target key, see below)
//   blank   leave that relationship empty
//   create  add a new member with that name (status Customer, unassigned)
export type Resolution = { kind: "member"; target: string } | { kind: "blank" } | { kind: "create" };

// A reference to a person inside a plan. "db:<id>" is someone already stored,
// "row:<index>" a row from this file, "new:<NAME>" a member created from an
// unresolved name, and "root" the network root (stored or about to be made).
export type TargetKey = string;

export type UnresolvedName = {
  /** "<field>|<FOLDED NAME>", the key the admin's choice is stored under. */
  key: string;
  field: "leader" | "referrer";
  /** The name as first written in the file. */
  name: string;
  /** How many rows mention it. */
  rows: number;
  /** A single confident match, if one exists, so the UI can preselect it. */
  suggestion: { target: TargetKey; label: string } | null;
  resolution: Resolution | null;
};

export type PlannedMember = {
  key: TargetKey;
  name: string;
  team: string | null;
  igniteId: string | null;
  status: NetworkStatus;
  leader: TargetKey | null;
  referrer: TargetKey | null;
  /** 1-based spreadsheet row, null for a member created from an unresolved name. */
  sourceRow: number | null;
};

export type ImportIssue = { row: number | null; message: string };

export type ImportPlan = {
  totalRows: number;
  create: PlannedMember[];
  /** Rows already in the system (same name or ID); left untouched. */
  skipped: { row: number; name: string; reason: string }[];
  /** Anything that makes the file unsafe to import. Non-empty blocks the commit. */
  errors: ImportIssue[];
  unresolved: UnresolvedName[];
  createRoot: boolean;
  stats: {
    leaderIsRoot: number;
    unassigned: number;
    missingId: number;
    referrerLinked: number;
    referrerBlank: number;
    createdFromNames: number;
  };
  /** True when nothing blocks the commit and every unresolved name has a choice. */
  ready: boolean;
};

function isNobody(raw: string | null): boolean {
  return raw === null || EMPTY_TOKENS.has(raw.toUpperCase().trim());
}

// A unique, word-aligned containment match: "HOAI VY" is part of "DINH HOAI
// VY", "LAN" is not part of "NGUYEN THI LAN ANH" unless it stands alone. Only
// a single candidate counts — two or more means the admin has to decide.
function suggest(folded: string, names: Map<string, { target: TargetKey; label: string }>): UnresolvedName["suggestion"] {
  const padded = ` ${folded} `;
  const hits: { target: TargetKey; label: string }[] = [];
  for (const [candidate, value] of names) {
    const c = ` ${candidate} `;
    if (c.includes(padded) || padded.includes(c)) hits.push(value);
  }
  return hits.length === 1 ? hits[0] : null;
}

export function planImport(args: {
  rows: readonly ImportRow[];
  existing: readonly ExistingMember[];
  resolutions: Readonly<Record<string, Resolution | undefined>>;
}): ImportPlan {
  const { rows, existing, resolutions } = args;
  const errors: ImportIssue[] = [];
  const skipped: ImportPlan["skipped"] = [];

  const existingRoot = existing.find((e) => e.isRoot) ?? null;
  const existingByName = new Map<string, ExistingMember>();
  const existingById = new Map<string, ExistingMember>();
  for (const e of existing) {
    existingByName.set(foldName(e.name), e);
    if (e.igniteId) existingById.set(e.igniteId, e);
  }
  const rootNames = new Set(ROOT_ALIASES);
  if (existingRoot) rootNames.add(foldName(existingRoot.name));

  // ---- pass 1: per-row checks -------------------------------------------------
  const seenNames = new Map<string, ImportRow>();
  const seenIds = new Map<string, ImportRow>();
  const accepted: { row: ImportRow; status: NetworkStatus }[] = [];
  // folded name -> target key, for resolving Leader/REFERRAL cells later.
  const index = new Map<string, { target: TargetKey; label: string }>();

  for (const e of existing) index.set(foldName(e.name), { target: `db:${e.id}`, label: e.name });

  for (const row of rows) {
    const folded = foldName(row.name);
    const where = `Dòng ${row.sourceRow}`;

    const dupName = seenNames.get(folded);
    if (dupName) {
      errors.push({
        row: row.sourceRow,
        message: `${where}: “${row.name}” trùng tên với dòng ${dupName.sourceRow}. Quan hệ ghi bằng tên nên không phân biệt được hai người, hãy đổi tên một trong hai trong file.`,
      });
      continue;
    }
    seenNames.set(folded, row);

    if (row.igniteId) {
      if (!isValidIgniteId(row.igniteId)) {
        errors.push({ row: row.sourceRow, message: `${where}: RapidX ID “${row.igniteId}” không đúng dạng DIA + 7 chữ số.` });
        continue;
      }
      const dupId = seenIds.get(row.igniteId);
      if (dupId) {
        errors.push({ row: row.sourceRow, message: `${where}: RapidX ID ${row.igniteId} trùng với dòng ${dupId.sourceRow}.` });
        continue;
      }
      seenIds.set(row.igniteId, row);
    }

    const stored = existingByName.get(folded);
    if (stored) {
      skipped.push({ row: row.sourceRow, name: row.name, reason: "Đã có trong hệ thống (trùng tên)" });
      continue;
    }
    if (row.igniteId && existingById.has(row.igniteId)) {
      errors.push({
        row: row.sourceRow,
        message: `${where}: RapidX ID ${row.igniteId} đã thuộc về ${existingById.get(row.igniteId)!.name}, không khớp với tên “${row.name}”.`,
      });
      continue;
    }

    const status = parseNetworkStatus(row.statusRaw);
    if (!status) {
      errors.push({
        row: row.sourceRow,
        message: row.statusRaw
          ? `${where}: trạng thái “${row.statusRaw}” không nhận ra (dùng Lead, Active, In-active, 0_PP hoặc Customer).`
          : `${where}: thiếu trạng thái.`,
      });
      continue;
    }

    accepted.push({ row, status });
    index.set(folded, { target: `row:${row.index}`, label: row.name });
  }

  // ---- pass 2: resolve Leader / REFERRAL cells --------------------------------
  // The only people an admin's choice may point at.
  const validTargets = new Set<string>(["root", ...existing.map((e) => `db:${e.id}`), ...accepted.map((a) => `row:${a.row.index}`)]);
  const created: PlannedMember[] = [];
  // Folded name -> the member created for it. Keyed by name alone (not by column)
  // so a person who is unresolved as a Leader and as a referrer is made once.
  const createdByName = new Map<string, TargetKey>();
  const unresolved = new Map<string, UnresolvedName>();
  const stats: ImportPlan["stats"] = {
    leaderIsRoot: 0,
    unassigned: 0,
    missingId: 0,
    referrerLinked: 0,
    referrerBlank: 0,
    createdFromNames: 0,
  };

  const resolveCell = (
    raw: string | null,
    field: "leader" | "referrer",
    self: ImportRow
  ): { target: TargetKey | null; pending: boolean } => {
    if (isNobody(raw)) return { target: null, pending: false };
    const folded = foldName(raw!);
    if (rootNames.has(folded)) return { target: "root", pending: false };
    const hit = index.get(folded);
    if (hit) {
      if (hit.target === `row:${self.index}`) {
        errors.push({ row: self.sourceRow, message: `Dòng ${self.sourceRow}: “${self.name}” được ghi là ${field === "leader" ? "Leader" : "người giới thiệu"} của chính mình.` });
        return { target: null, pending: false };
      }
      return { target: hit.target, pending: false };
    }

    const key = `${field}|${folded}`;
    let entry = unresolved.get(key);
    if (!entry) {
      entry = { key, field, name: raw!, rows: 0, suggestion: suggest(folded, index), resolution: null };
      const choice = resolutions[key];
      if (choice) entry.resolution = choice;
      unresolved.set(key, entry);
    }
    entry.rows += 1;

    const choice = entry.resolution;
    if (!choice) return { target: null, pending: true };
    if (choice.kind === "blank") return { target: null, pending: false };
    if (choice.kind === "member") {
      if (!validTargets.has(choice.target) || choice.target === `row:${self.index}`) {
        errors.push({ row: null, message: `Lựa chọn cho “${entry.name}” trỏ tới một người không hợp lệ.` });
        return { target: null, pending: false };
      }
      return { target: choice.target, pending: false };
    }
    // create
    let newKey = createdByName.get(folded);
    if (!newKey) {
      newKey = `new:${folded}`;
      createdByName.set(folded, newKey);
      created.push({ key: newKey, name: entry.name, team: null, igniteId: null, status: "CUSTOMER", leader: null, referrer: null, sourceRow: null });
      stats.createdFromNames += 1;
    }
    return { target: newKey, pending: false };
  };

  const planned: PlannedMember[] = [];
  for (const { row, status } of accepted) {
    const leader = resolveCell(row.leaderRaw, "leader", row);
    const referrer = resolveCell(row.referrerRaw, "referrer", row);
    if (leader.target === "root") stats.leaderIsRoot += 1;
    if (leader.target === null && !leader.pending) stats.unassigned += 1;
    if (referrer.target) stats.referrerLinked += 1;
    else if (!referrer.pending) stats.referrerBlank += 1;
    if (!row.igniteId) stats.missingId += 1;
    planned.push({
      key: `row:${row.index}`,
      name: row.name,
      team: row.team,
      igniteId: row.igniteId,
      status,
      leader: leader.target,
      referrer: referrer.target,
      sourceRow: row.sourceRow,
    });
  }

  // ---- pass 3: cycles among the new members -----------------------------------
  // Stored members never point at new ones, so a loop can only close among the
  // people this import adds. Walk each chain; revisiting a node means a loop.
  const members = [...planned, ...created];
  const byKey = new Map(members.map((m) => [m.key, m]));
  for (const relation of ["leader", "referrer"] as const) {
    const reported = new Set<string>();
    for (const start of members) {
      const trail: string[] = [];
      const seen = new Set<string>();
      let current: PlannedMember | undefined = start;
      while (current && !seen.has(current.key)) {
        seen.add(current.key);
        trail.push(current.name);
        const next: TargetKey | null = current[relation];
        current = next ? byKey.get(next) : undefined;
      }
      if (current && !reported.has(current.key)) {
        for (const k of seen) reported.add(k);
        errors.push({
          row: null,
          message: `Vòng lặp ${relation === "leader" ? "Leader" : "người giới thiệu"}: ${trail.slice(trail.indexOf(current.name)).join(" → ")} → ${current.name}.`,
        });
      }
    }
  }

  const list = [...unresolved.values()];
  return {
    totalRows: rows.length,
    create: members,
    skipped,
    errors,
    unresolved: list,
    createRoot: existingRoot === null,
    stats,
    ready: errors.length === 0 && list.every((u) => u.resolution !== null),
  };
}
