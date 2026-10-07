"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NETWORK_STATUS_CONFIG, NETWORK_STATUS_ORDER, type NetworkStatus } from "@/lib/network-status";
import {
  branchLabel,
  compareNames,
  foldName,
  matchesSearch,
  type NetworkMemberLite,
  type StatusCounts,
  type TreeRelation,
} from "@/lib/network-tree";
import type { LayoutDirection } from "@/lib/network-layout";
import { InitialsAvatar, Segmented, StatusPill, idLabel } from "./network-ui";

export type ViewMode = "tree" | "compact";
export type RoleFilter = "all" | "leader" | "member";

// The KPI strip doubles as the status filter: clicking "Active 32" narrows the
// map to Active people, clicking it again (or "Tổng") clears it. One control
// instead of a second row of chips saying the same thing.
export function KpiStrip({
  counts,
  active,
  onChange,
}: {
  counts: StatusCounts;
  active: NetworkStatus | "ALL";
  onChange: (status: NetworkStatus | "ALL") => void;
}) {
  const tile = (selected: boolean) =>
    `flex min-w-[6.5rem] flex-1 flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors ${
      selected ? "border-primary bg-primary-bg" : "border-border bg-surface hover:bg-surface-hover"
    }`;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo trạng thái">
      <button type="button" className={tile(active === "ALL")} aria-pressed={active === "ALL"} onClick={() => onChange("ALL")}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Tổng thành viên</span>
        <span className={`text-2xl font-bold tabular-nums ${active === "ALL" ? "text-primary-hover" : "text-foreground"}`}>{counts.total}</span>
      </button>
      {NETWORK_STATUS_ORDER.map((s) => {
        const selected = active === s;
        return (
          <button key={s} type="button" className={tile(selected)} aria-pressed={selected} onClick={() => onChange(selected ? "ALL" : s)}>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <span className={`h-2 w-2 rounded-full ${NETWORK_STATUS_CONFIG[s].dot}`} />
              {NETWORK_STATUS_CONFIG[s].label}
            </span>
            <span className={`text-2xl font-bold tabular-nums ${selected ? "text-primary-hover" : "text-foreground"}`}>{counts[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

// Finds a member by name or RapidX ID, ignoring Vietnamese marks, and hands the
// pick to the page, which unfolds the branches above them and flies the camera
// there.
function MemberSearch({
  members,
  heads,
  byId,
  onPick,
}: {
  members: readonly NetworkMemberLite[];
  heads: ReadonlyMap<string, string | null>;
  byId: ReadonlyMap<string, NetworkMemberLite>;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = foldName(query);
    if (!q) return [];
    return members
      .filter((m) => matchesSearch(m, q))
      .sort((a, b) => compareNames(a.name, b.name))
      .slice(0, 8);
  }, [members, query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function pick(m: NetworkMemberLite) {
    setOpen(false);
    setQuery(m.name);
    onPick(m.id);
  }

  return (
    <div ref={box} className="relative min-w-[14rem] flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={query}
        placeholder="Tìm tên hoặc RapidX ID…"
        aria-label="Tìm thành viên"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && results[index]) {
            e.preventDefault();
            pick(results[index]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-base text-foreground placeholder:text-faint focus:border-primary focus:outline-none sm:text-sm"
      />
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-primary-border bg-surface shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">Không tìm thấy thành viên nào.</p>
          ) : (
            <ul role="listbox" aria-label="Kết quả tìm kiếm">
              {results.map((m, i) => (
                <li key={m.id} role="option" aria-selected={i === index}>
                  <button
                    type="button"
                    onClick={() => pick(m)}
                    onMouseEnter={() => setIndex(i)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${i === index ? "bg-surface-hover" : ""}`}
                  >
                    <InitialsAvatar name={m.name} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{m.name}</span>
                      <span className="block truncate text-xs text-muted">
                        <span className="font-mono">{idLabel(m.igniteId)}</span> · nhánh {branchLabel(m, heads, byId)}
                      </span>
                    </span>
                    <StatusPill status={m.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const selectClass =
  "rounded-lg border border-border-strong bg-surface px-2.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

export function NetworkToolbar({
  members,
  heads,
  byId,
  view,
  onView,
  mode,
  onMode,
  direction,
  onDirection,
  branches,
  branchFilter,
  onBranchFilter,
  leaders,
  leaderFilter,
  onLeaderFilter,
  roleFilter,
  onRoleFilter,
  teams,
  teamFilter,
  onTeamFilter,
  prune,
  onPrune,
  filtersActive,
  onClearFilters,
  onPickMember,
  onAdd,
  onImport,
  onRefresh,
  refreshing,
  compact,
}: {
  members: readonly NetworkMemberLite[];
  heads: ReadonlyMap<string, string | null>;
  byId: ReadonlyMap<string, NetworkMemberLite>;
  view: TreeRelation;
  onView: (v: TreeRelation) => void;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  direction: LayoutDirection;
  onDirection: (d: LayoutDirection) => void;
  branches: { id: string; name: string }[];
  branchFilter: string;
  onBranchFilter: (v: string) => void;
  leaders: { id: string; name: string }[];
  leaderFilter: string;
  onLeaderFilter: (v: string) => void;
  roleFilter: RoleFilter;
  onRoleFilter: (v: RoleFilter) => void;
  teams: string[];
  teamFilter: string;
  onTeamFilter: (v: string) => void;
  prune: boolean;
  onPrune: (v: boolean) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
  onPickMember: (id: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  /** Phone layout: drop the controls that only make sense on the canvas. */
  compact: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MemberSearch members={members} heads={heads} byId={byId} onPick={onPickMember} />
      <Segmented
        label="Kiểu cây"
        value={view}
        onChange={onView}
        options={[
          { value: "leader", label: "Tổ chức" },
          { value: "referrer", label: "Giới thiệu" },
        ]}
      />
      {!compact && (
        <>
          <Segmented
            label="Chế độ xem"
            value={mode}
            onChange={onMode}
            options={[
              { value: "tree", label: "Cây" },
              { value: "compact", label: "Gọn" },
            ]}
          />
          <Segmented
            label="Hướng sơ đồ"
            value={direction}
            onChange={onDirection}
            options={[
              { value: "horizontal", label: "Ngang" },
              { value: "vertical", label: "Dọc" },
            ]}
          />
          <select className={selectClass} aria-label="Lọc theo nhánh" value={branchFilter} onChange={(e) => onBranchFilter(e.target.value)}>
            <option value="all">Mọi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                Nhánh {b.name}
              </option>
            ))}
          </select>
          <select className={selectClass} aria-label="Lọc theo Leader" value={leaderFilter} onChange={(e) => onLeaderFilter(e.target.value)}>
            <option value="all">Mọi Leader</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>
                Đội {l.name}
              </option>
            ))}
          </select>
          <select className={selectClass} aria-label="Lọc theo team" value={teamFilter} onChange={(e) => onTeamFilter(e.target.value)}>
            <option value="all">Mọi team</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                Team {t}
              </option>
            ))}
          </select>
          <select className={selectClass} aria-label="Lọc theo vai trò" value={roleFilter} onChange={(e) => onRoleFilter(e.target.value as RoleFilter)}>
            <option value="all">Mọi vai trò</option>
            <option value="leader">Trưởng đội</option>
            <option value="member">Thành viên</option>
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={prune} onChange={(e) => onPrune(e.target.checked)} />
            Chỉ hiện nhánh có kết quả
          </label>
        </>
      )}
      {filtersActive && (
        <Button type="button" size="sm" variant="ghost" onClick={onClearFilters}>
          Xóa bộ lọc
        </Button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button type="button" size="icon" variant="ghost" aria-label="Làm mới danh sách" title="Làm mới" disabled={refreshing} onClick={onRefresh}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        {!compact && (
          <Button type="button" size="sm" variant="secondary" onClick={onImport}>
            <FileSpreadsheet className="h-4 w-4" />
            Nhập từ Excel
          </Button>
        )}
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Thêm thành viên
        </Button>
      </div>
    </div>
  );
}
