"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTree, compareNames, descendantIds, type NetworkMemberLite } from "@/lib/network-tree";
import { MemberPicker } from "./member-picker";
import { StatusPill, idLabel } from "./network-ui";

// The UNASSIGNED list: everyone with no leader who is not the network root.
// Ticking several and choosing a leader assigns them all in one action — the
// source spreadsheet has 36 such people, and one at a time would be the slow way
// to place them.
export function BucketPanel({
  members,
  allMembers,
  byId,
  onAssign,
  onClose,
}: {
  /** The unassigned members. */
  members: readonly NetworkMemberLite[];
  allMembers: readonly NetworkMemberLite[];
  byId: ReadonlyMap<string, NetworkMemberLite>;
  onAssign: (ids: string[], leaderId: string) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [leaderId, setLeaderId] = useState<string | null>(null);

  const inBucket = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  // A leader is chosen from people already placed in the tree. Unassigned
  // people are left out: assigning one under another is allowed in principle
  // but pointless here, and it would hide the person from this list.
  const candidates = useMemo(() => allMembers.filter((m) => !inBucket.has(m.id)), [allMembers, inBucket]);
  const sorted = useMemo(() => [...members].sort((a, b) => compareNames(a.name, b.name)), [members]);

  // Anyone removed from the bucket meanwhile (assigned, deleted) drops out of the selection.
  const selected = sorted.filter((m) => picked.has(m.id)).map((m) => m.id);
  const allPicked = sorted.length > 0 && selected.length === sorted.length;

  // An unassigned person can still have a team of their own, and putting them under
  // someone from that team would close a loop. Those people are not offered, the
  // same rule the edit form applies (the server refuses it either way).
  const excluded = useMemo(() => {
    if (picked.size === 0) return undefined;
    const { kids } = buildTree(allMembers, "leader");
    const out = new Set<string>();
    for (const m of sorted) if (picked.has(m.id)) for (const below of descendantIds(kids, m.id)) out.add(below);
    return out;
  }, [allMembers, sorted, picked]);
  const chosenLeader = leaderId && !excluded?.has(leaderId) ? leaderId : null;

  function toggle(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-wide text-foreground">UNASSIGNED</h2>
          <p className="mt-0.5 text-xs text-muted">{sorted.length} thành viên chưa có Leader</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <label className="flex cursor-pointer items-center gap-3 border-b border-border px-2 py-2.5 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={allPicked}
            onChange={() => setPicked(allPicked ? new Set() : new Set(sorted.map((m) => m.id)))}
          />
          Chọn tất cả ({sorted.length})
        </label>
        <ul>
          {sorted.map((m) => (
            <li key={m.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{m.name}</span>
                  <span className="block truncate text-xs text-muted">
                    <span className="font-mono">{idLabel(m.igniteId)}</span>
                    {m.team ? ` · ${m.team}` : ""}
                    {m.referrerId && byId.get(m.referrerId) ? ` · giới thiệu bởi ${byId.get(m.referrerId)!.name}` : ""}
                  </span>
                </span>
                <StatusPill status={m.status} />
              </label>
            </li>
          ))}
        </ul>
        {sorted.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">Không còn ai chưa có Leader.</p>}
      </div>

      <div className="space-y-2 border-t border-border px-5 py-3">
        <MemberPicker
          id="bucket-leader"
          label="Gán Leader"
          members={candidates}
          value={chosenLeader}
          onChange={setLeaderId}
          noneLabel="Chọn Leader…"
          excluded={excluded}
        />
        <Button
          type="button"
          className="w-full"
          disabled={selected.length === 0 || !chosenLeader}
          onClick={() => {
            if (!chosenLeader) return;
            onAssign(selected, chosenLeader);
            setPicked(new Set());
            setLeaderId(null);
          }}
        >
          Gán Leader cho {selected.length} người
        </Button>
      </div>
    </div>
  );
}
