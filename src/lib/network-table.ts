// Pure rules behind the member table: how rows are ordered, how pages are cut, and
// which fields an edit actually changed. No React, no Prisma, so node:test covers
// them and the table component stays about drawing.
import { NETWORK_STATUS_ORDER } from "./network-status";
import { compareNames, type NetworkMemberLite } from "./network-tree";

export type SortKey = "name" | "status" | "leader" | "branch" | "downline";
export type SortState = { key: SortKey; dir: 1 | -1 };

export const DEFAULT_SORT: SortState = { key: "name", dir: 1 };
export const PAGE_SIZES = [25, 50, 100] as const;

type SortContext = {
  byId: ReadonlyMap<string, NetworkMemberLite>;
  /** The branch name shown for a member (the "Nhánh" column). */
  branchOf: (member: NetworkMemberLite) => string;
  /** People below a member in the tree the table is showing. */
  downline: (id: string) => number;
};

// Ties always fall back to the name, so the order is stable and two people never swap
// places between renders. Someone with no leader sorts after everyone who has one, in
// either direction: "Chưa có Leader" is the row an admin wants to find, not bury.
export function sortMembers(list: readonly NetworkMemberLite[], sort: SortState, ctx: SortContext): NetworkMemberLite[] {
  const compare = (a: NetworkMemberLite, b: NetworkMemberLite): number => {
    switch (sort.key) {
      case "name":
        return compareNames(a.name, b.name);
      case "status":
        return NETWORK_STATUS_ORDER.indexOf(a.status) - NETWORK_STATUS_ORDER.indexOf(b.status);
      case "branch":
        return compareNames(ctx.branchOf(a), ctx.branchOf(b));
      case "downline":
        return ctx.downline(a.id) - ctx.downline(b.id);
      case "leader": {
        const x = a.leaderId ? ctx.byId.get(a.leaderId)?.name : undefined;
        const y = b.leaderId ? ctx.byId.get(b.leaderId)?.name : undefined;
        if (x === undefined || y === undefined) {
          if (x === y) return 0;
          // Missing sorts last whichever way the column is flipped, so undo the flip below.
          return (x === undefined ? 1 : -1) * sort.dir;
        }
        return compareNames(x, y);
      }
    }
  };
  return [...list].sort((a, b) => compare(a, b) * sort.dir || compareNames(a.name, b.name));
}

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

/** 1-based page that holds the row at `index`. */
export function pageOfIndex(index: number, size: number): number {
  return Math.floor(index / size) + 1;
}

export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, page), pageCount(total, size));
}

// Page buttons for the pager: the first and last page, the current one with a
// neighbour either side, and "gap" where pages are skipped.
export function visiblePages(page: number, pages: number): (number | "gap")[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export type EditableFields = {
  name: string;
  igniteId: string | null;
  team: string | null;
  leaderId: string | null;
  referrerId: string | null;
};

// What an edit really changed. Only these fields are sent to the server, so saving a
// team never carries along a stale copy of the leader. The root has no leader, so a
// leader value for it is ignored.
export function changedFields(existing: NetworkMemberLite, next: EditableFields): Partial<EditableFields> {
  const out: Partial<EditableFields> = {};
  if (next.name !== existing.name) out.name = next.name;
  if (next.igniteId !== existing.igniteId) out.igniteId = next.igniteId;
  if (next.team !== existing.team) out.team = next.team;
  if (next.referrerId !== existing.referrerId) out.referrerId = next.referrerId;
  if (!existing.isRoot && next.leaderId !== existing.leaderId) out.leaderId = next.leaderId;
  return out;
}

// The ids that are both ticked and still in the (filtered) table. A row that a filter
// has hidden is dropped from the selection, so "Xóa 3 người" never deletes someone the
// admin cannot see.
export function visibleSelection(picked: ReadonlySet<string>, rows: readonly NetworkMemberLite[]): string[] {
  return rows.filter((m) => picked.has(m.id) && !m.isRoot).map((m) => m.id);
}
