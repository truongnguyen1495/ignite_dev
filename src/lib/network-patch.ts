// Optimistic edits to the member list. The page applies a change to its own copy
// straight away and tells the server in the background; if the server says no,
// the same change is undone. Undoing means restoring only the rows that change
// touched — not rolling the whole list back to an old snapshot, which would
// also erase any other edit made while this one was in flight.
import type { NetworkMemberLite } from "./network-tree";

export type MemberPatch = { upsert?: NetworkMemberLite[]; remove?: string[] };

export function applyPatch(list: readonly NetworkMemberLite[], patch: MemberPatch): NetworkMemberLite[] {
  const removed = new Set(patch.remove ?? []);
  const upserts = new Map((patch.upsert ?? []).map((m) => [m.id, m]));
  const next: NetworkMemberLite[] = [];
  for (const m of list) {
    if (removed.has(m.id)) continue;
    const replacement = upserts.get(m.id);
    if (replacement) {
      next.push(replacement);
      upserts.delete(m.id);
    } else {
      next.push(m);
    }
  }
  for (const added of upserts.values()) next.push(added);
  return next;
}

// The patch that puts back exactly what `patch` would change in `list`.
export function inversePatch(list: readonly NetworkMemberLite[], patch: MemberPatch): MemberPatch {
  const byId = new Map(list.map((m) => [m.id, m]));
  const upsert: NetworkMemberLite[] = [];
  const remove: string[] = [];
  for (const m of patch.upsert ?? []) {
    const before = byId.get(m.id);
    if (before) upsert.push(before);
    else remove.push(m.id);
  }
  for (const id of patch.remove ?? []) {
    const before = byId.get(id);
    if (before) upsert.push(before);
  }
  return { upsert, remove };
}
