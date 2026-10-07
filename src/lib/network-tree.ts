// Pure tree logic for Team Network: building the Organization (Leader) and
// Referral trees from the flat member list, counting downline, deriving the
// "branch" and refusing cycles. No Prisma, no React — the page, the Server
// Actions and node:test all import this, so the rule that decides whether a
// change is allowed is written once.
//
// Nothing here stores a tree. A tree is always rebuilt from each member's
// leaderId / referrerId, which is why moving someone is a one-column write.
import { NETWORK_STATUS_ORDER, type NetworkStatus } from "./network-status";

export type NetworkMemberLite = {
  id: string;
  name: string;
  /** Shown in the UI as "RapidX ID". null = the person has none yet. */
  igniteId: string | null;
  status: NetworkStatus;
  team: string | null;
  isRoot: boolean;
  leaderId: string | null;
  referrerId: string | null;
};

// "leader" builds the Organization tree, "referrer" the Referral tree. They are
// two separate relationships on purpose: in the source spreadsheet the leader
// and the referrer differ on 90 of 119 rows.
export type TreeRelation = "leader" | "referrer";

// Synthetic parent for members that have no leader and are not the root. It is
// a display bucket, never a row in the database.
export const UNASSIGNED_ID = "__unassigned__";

// "DIA" + 7 digits, the shape of every IGNITE ID in the source spreadsheet.
// Kept in one place so tightening or loosening it later is a one-line change.
export const IGNITE_ID_PATTERN = /^DIA\d{7}$/;

export function isValidIgniteId(value: string): boolean {
  return IGNITE_ID_PATTERN.test(value);
}

// Folds a name to uppercase ASCII with single spaces, so "Nguyễn  Thị Việt"
// and "NGUYEN THI VIET" are the same person when the importer matches a
// "Leader" or "REFERRAL" cell to a member. NFD splits a letter from its tone
// marks so the marks can be dropped; đ/Đ does not decompose, so it is mapped
// by hand.
export function foldName(value: string): string {
  let out = "";
  for (const char of value.normalize("NFD")) {
    const code = char.codePointAt(0)!;
    if (code >= 0x0300 && code <= 0x036f) continue;
    out += char === "đ" || char === "Đ" ? "D" : char;
  }
  return out.toUpperCase().replace(/\s+/g, " ").trim();
}

const collator = new Intl.Collator("vi");

export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}

export type StatusCounts = Record<NetworkStatus, number> & { total: number };

export function emptyCounts(): StatusCounts {
  return { total: 0, LEAD: 0, ACTIVE: 0, INACTIVE: 0, ZERO_PP: 0, CUSTOMER: 0 };
}

export function countByStatus(members: readonly NetworkMemberLite[]): StatusCounts {
  const counts = emptyCounts();
  for (const m of members) {
    counts[m.status] += 1;
    counts.total += 1;
  }
  return counts;
}

export type NetworkTree = {
  relation: TreeRelation;
  /** Child ids per node. Includes UNASSIGNED_ID (leader relation only). */
  kids: Map<string, string[]>;
  /** Top of every tree. The unassigned bucket, when present, is last. */
  roots: string[];
  /** Total people below each node, at any depth. */
  descendants: Map<string, number>;
  /** Status counts for each node's whole subtree, the node itself included. */
  stats: Map<string, StatusCounts>;
  /** Members no root reaches. Only non-empty if stored data holds a cycle. */
  unreachable: string[];
};

export function buildTree(members: readonly NetworkMemberLite[], relation: TreeRelation): NetworkTree {
  const byId = new Map(members.map((m) => [m.id, m]));
  const parentOf = (m: NetworkMemberLite): string | null => {
    const parent = relation === "leader" ? m.leaderId : m.referrerId;
    return parent && byId.has(parent) ? parent : null;
  };

  const kids = new Map<string, string[]>();
  for (const m of members) kids.set(m.id, []);
  const roots: string[] = [];
  const unassigned: string[] = [];

  for (const m of members) {
    const parent = parentOf(m);
    if (parent) kids.get(parent)!.push(m.id);
    else if (relation === "leader" && !m.isRoot) unassigned.push(m.id);
    else roots.push(m.id);
  }

  const byName = (a: string, b: string) => compareNames(byId.get(a)!.name, byId.get(b)!.name);
  for (const list of kids.values()) list.sort(byName);
  roots.sort(byName);
  if (unassigned.length > 0) {
    unassigned.sort(byName);
    kids.set(UNASSIGNED_ID, unassigned);
    roots.push(UNASSIGNED_ID);
  }

  const descendants = new Map<string, number>();
  const stats = new Map<string, StatusCounts>();
  const seen = new Set<string>();
  // Iterative post-order so a deep or pathological chain cannot overflow the
  // call stack; `seen` also stops a cycle from looping forever.
  for (const root of roots) {
    const stack: { id: string; expanded: boolean }[] = [{ id: root, expanded: false }];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (!top.expanded) {
        if (seen.has(top.id)) {
          stack.pop();
          continue;
        }
        seen.add(top.id);
        top.expanded = true;
        for (const child of kids.get(top.id) ?? []) stack.push({ id: child, expanded: false });
        continue;
      }
      stack.pop();
      const counts = emptyCounts();
      let below = 0;
      for (const child of kids.get(top.id) ?? []) {
        const childStats = stats.get(child);
        if (!childStats) continue;
        below += 1 + (descendants.get(child) ?? 0);
        counts.total += childStats.total;
        for (const status of NETWORK_STATUS_ORDER) counts[status] += childStats[status];
      }
      if (top.id !== UNASSIGNED_ID) {
        const self = byId.get(top.id)!;
        counts[self.status] += 1;
        counts.total += 1;
      }
      descendants.set(top.id, below);
      stats.set(top.id, counts);
    }
  }

  const unreachable = members.filter((m) => !seen.has(m.id)).map((m) => m.id);
  return { relation, kids, roots, descendants, stats, unreachable };
}

// Ancestors from the top down to `id` inclusive. In the leader relation a
// member with no leader that is not the root sits under UNASSIGNED_ID, so the
// breadcrumb reads "UNASSIGNED › name" exactly like the tree does.
export function chainTo(
  byId: ReadonlyMap<string, NetworkMemberLite>,
  relation: TreeRelation,
  id: string
): string[] {
  if (id === UNASSIGNED_ID) return [UNASSIGNED_ID];
  const out: string[] = [];
  const seen = new Set<string>();
  let current: string | null = id;
  while (current && !seen.has(current)) {
    seen.add(current);
    out.unshift(current);
    const member = byId.get(current);
    if (!member) break;
    const parent = relation === "leader" ? member.leaderId : member.referrerId;
    if (parent && byId.has(parent)) {
      current = parent;
    } else {
      if (relation === "leader" && !member.isRoot) out.unshift(UNASSIGNED_ID);
      break;
    }
  }
  return out;
}

// The branch a member belongs to is derived, never stored: walk the Leader
// chain up until the member whose leader is the root — that member is the
// branch head (NHƯ, KHANG, VY in the source data). So changing someone's
// leader moves their branch with them and the two can never disagree.
// null → no branch: the root itself, an unassigned member, or a broken chain.
export function computeBranchHeads(members: readonly NetworkMemberLite[]): Map<string, string | null> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const memo = new Map<string, string | null>();
  const resolve = (id: string): string | null => {
    const trail: string[] = [];
    const visiting = new Set<string>();
    let head: string | null = null;
    let current: string | null = id;
    while (current) {
      if (memo.has(current)) {
        head = memo.get(current)!;
        break;
      }
      if (visiting.has(current)) break;
      visiting.add(current);
      trail.push(current);
      const member = byId.get(current);
      if (!member || member.isRoot) break;
      const leader: NetworkMemberLite | undefined = member.leaderId ? byId.get(member.leaderId) : undefined;
      if (!leader) break;
      if (leader.isRoot) {
        head = current;
        break;
      }
      current = leader.id;
    }
    for (const t of trail) memo.set(t, head);
    return head;
  };
  const result = new Map<string, string | null>();
  for (const m of members) result.set(m.id, m.isRoot ? null : resolve(m.id));
  return result;
}

export const ROOT_BRANCH_LABEL = "Gốc";
export const NO_BRANCH_LABEL = "Chưa gán";

export function branchLabel(
  member: NetworkMemberLite,
  heads: ReadonlyMap<string, string | null>,
  byId: ReadonlyMap<string, NetworkMemberLite>
): string {
  if (member.isRoot) return ROOT_BRANCH_LABEL;
  const head = heads.get(member.id);
  return head ? (byId.get(head)?.name ?? NO_BRANCH_LABEL) : NO_BRANCH_LABEL;
}

// True when making `newParentId` the parent of `memberId` would close a loop:
// the new parent is the member itself or one of the member's own descendants
// (which means walking up from the new parent reaches the member). The Server
// Actions repeat this check against the database inside the write transaction;
// this copy powers the form so an impossible choice is greyed out up front.
export function wouldCreateCycle(
  byId: ReadonlyMap<string, NetworkMemberLite>,
  relation: TreeRelation,
  memberId: string,
  newParentId: string | null
): boolean {
  let current = newParentId;
  const seen = new Set<string>();
  while (current) {
    if (current === memberId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    const m = byId.get(current);
    if (!m) return false;
    current = relation === "leader" ? m.leaderId : m.referrerId;
  }
  return false;
}

export function descendantIds(kids: ReadonlyMap<string, string[]>, id: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>([id]);
  const stack = [...(kids.get(id) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    stack.push(...(kids.get(next) ?? []));
  }
  return out;
}

// Name or RapidX ID contains the query, ignoring case and Vietnamese marks.
export function matchesSearch(member: NetworkMemberLite, foldedQuery: string): boolean {
  if (!foldedQuery) return true;
  if (foldName(member.name).includes(foldedQuery)) return true;
  return member.igniteId ? member.igniteId.includes(foldedQuery) : false;
}

export function distinctTeams(members: readonly NetworkMemberLite[]): string[] {
  const set = new Set<string>();
  for (const m of members) if (m.team) set.add(m.team);
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}
