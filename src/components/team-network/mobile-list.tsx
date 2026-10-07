"use client";

import { ChevronRight } from "lucide-react";
import { UNASSIGNED_ID, chainTo, type NetworkMemberLite, type NetworkTree, type TreeRelation } from "@/lib/network-tree";
import { InitialsAvatar, StatusPill, idLabel } from "./network-ui";

// On a phone a left-to-right map of a whole network is unusable, so the same
// tree becomes a list you walk down: branches, then a leader's people, then a
// person. Tapping a name opens their profile as a sheet; "Mở" goes one level
// deeper.
export function MobileList({
  tree,
  byId,
  view,
  cursor,
  onCursor,
  onProfile,
  dimmed,
  flashId,
}: {
  tree: NetworkTree;
  byId: ReadonlyMap<string, NetworkMemberLite>;
  view: TreeRelation;
  cursor: string | null;
  onCursor: (id: string | null) => void;
  onProfile: (id: string) => void;
  /** Ids to grey out because they do not match the active filters. */
  dimmed: ReadonlySet<string> | null;
  flashId: string | null;
}) {
  const here = cursor && tree.kids.has(cursor) ? cursor : null;
  const list = here ? (tree.kids.get(here) ?? []) : tree.roots;
  const chain = here ? chainTo(byId, view, here) : [];
  const nameOf = (id: string) => (id === UNASSIGNED_ID ? "UNASSIGNED" : (byId.get(id)?.name ?? "—"));
  const current = here && here !== UNASSIGNED_ID ? byId.get(here) : undefined;

  return (
    <div className="space-y-3">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => onCursor(null)}
          className={`rounded-full border px-2.5 py-1 ${here ? "border-border text-muted" : "border-primary-border text-primary"}`}
        >
          Tất cả
        </button>
        {chain.map((id, i) => (
          <span key={id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-faint" />
            <button
              type="button"
              onClick={() => onCursor(id)}
              className={`max-w-[9rem] truncate rounded-full border px-2.5 py-1 ${i === chain.length - 1 ? "border-primary-border text-primary" : "border-border text-muted"}`}
            >
              {nameOf(id)}
            </button>
          </span>
        ))}
      </nav>

      {current && (
        <div className="flex items-center gap-3 rounded-xl border border-primary-border bg-primary-bg px-3 py-3">
          <InitialsAvatar name={current.name} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{current.name}</p>
            <p className="text-xs text-muted">
              <span className="font-mono">{idLabel(current.igniteId)}</span> · {tree.descendants.get(current.id) ?? 0} downline
            </p>
          </div>
          <StatusPill status={current.status} />
          <button type="button" onClick={() => onProfile(current.id)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground">
            Hồ sơ
          </button>
        </div>
      )}

      {list.length === 0 && <p className="py-8 text-center text-sm text-muted">Chưa có thành viên trực tiếp.</p>}

      <ul className="space-y-2">
        {list.map((id) => {
          if (id === UNASSIGNED_ID) {
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onCursor(id)}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-surface px-3 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-bold tracking-widest text-foreground">UNASSIGNED</span>
                    <span className="block text-xs text-muted">{tree.descendants.get(id) ?? 0} thành viên chưa có Leader</span>
                  </span>
                  <span className="text-xs font-semibold text-primary">Mở ›</span>
                </button>
              </li>
            );
          }
          const m = byId.get(id);
          if (!m) return null;
          const hasKids = (tree.kids.get(id)?.length ?? 0) > 0;
          return (
            <li
              key={id}
              data-row={id}
              className={`flex items-center gap-2.5 rounded-xl border bg-surface px-3 py-2.5 ${flashId === id ? "border-primary bg-primary-bg" : "border-border"} ${
                dimmed && dimmed.has(id) ? "opacity-30" : ""
              }`}
            >
              <InitialsAvatar name={m.name} size={32} />
              <button type="button" onClick={() => onProfile(id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-foreground">{m.name}</span>
                <span className="block truncate text-xs text-muted">
                  <span className="font-mono">{idLabel(m.igniteId)}</span> · {tree.descendants.get(id) ?? 0} downline
                </span>
              </button>
              <StatusPill status={m.status} />
              {hasKids && (
                <button type="button" onClick={() => onCursor(id)} className="shrink-0 px-1 text-xs font-semibold text-primary" aria-label={`Mở đội ${m.name}`}>
                  Mở ›
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
