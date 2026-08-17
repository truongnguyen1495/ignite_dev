"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  Crown,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ModalShell } from "@/components/ui/modal-shell";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { formatPointsVN } from "@/lib/groups";
import { deleteGroupAction, renameGroupAction } from "./actions";

export type GroupCard = {
  id: string;
  name: string;
  createdAtLabel: string;
  createdAtMs: number;
  memberCount: number;
  previewMembers: { id: string; name: string; avatarUrl: string | null }[];
  leaderName: string | null;
  deputyCount: number;
  todayTotal: number;
  todayDone: number;
  pendingExplanations: number;
  totalPoints: number;
  averagePoints: number;
  rank: number | null;
};

type SortKey = "average" | "members" | "today" | "name" | "created";

const SORT_LABELS: Record<SortKey, string> = {
  average: "Điểm/người",
  members: "Số thành viên",
  today: "% hôm nay",
  name: "Tên A–Z",
  created: "Mới tạo nhất",
};

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

// A group is "cần xử lý" when an admin has something to actually do about
// it: explanations waiting on a decision, nobody in charge, or nobody in it.
function needsAttention(group: GroupCard): boolean {
  return group.pendingExplanations > 0 || !group.leaderName || group.memberCount === 0;
}

// -1 sorts "no tasks running today" below 0% — an idle group and a group
// failing its tasks are different things and shouldn't interleave.
function todayPercent(group: GroupCard): number {
  return group.todayTotal > 0 ? group.todayDone / group.todayTotal : -1;
}

function meterTone(percent: number): string {
  if (percent >= 0.75) return "bg-success";
  if (percent >= 0.4) return "bg-info";
  return "bg-warning";
}

export function GroupsExplorer({ groups }: { groups: GroupCard[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("average");
  const [view, setView] = useState<ViewMode>("grid");
  const [rawSelection, setRawSelection] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<GroupCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupCard | null>(null);

  // Stable identity: GroupMenu keeps document/window listeners keyed on it,
  // and a fresh closure every render would tear them down and re-attach on
  // every keystroke in the search box.
  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  const attentionCount = useMemo(() => groups.filter(needsAttention).length, [groups]);
  const assignableGroups = useMemo(() => groups.filter((g) => g.memberCount > 0), [groups]);

  // Derived rather than stored, so a group deleted (or emptied) in another
  // tab can never leave a phantom id in the selection that the bulk-assign
  // link would then carry over.
  const selected = useMemo(
    () => assignableGroups.filter((g) => rawSelection.has(g.id)),
    [assignableGroups, rawSelection]
  );
  const selectedMemberTotal = selected.reduce((sum, g) => sum + g.memberCount, 0);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = groups.filter((group) => {
      if (onlyAttention && !needsAttention(group)) return false;
      if (!term) return true;
      return (
        group.name.toLowerCase().includes(term) ||
        (group.leaderName ?? "").toLowerCase().includes(term)
      );
    });

    return [...filtered].sort((a, b) => {
      // An empty group has no score, no progress and no roster to compare —
      // it stays at the bottom under every sort instead of topping "Tên A–Z"
      // or "Mới tạo nhất" and pushing the live groups out of sight.
      const emptyDiff = (a.memberCount === 0 ? 1 : 0) - (b.memberCount === 0 ? 1 : 0);
      if (emptyDiff !== 0) return emptyDiff;

      switch (sortKey) {
        case "members":
          return b.memberCount - a.memberCount;
        case "today":
          return todayPercent(b) - todayPercent(a);
        case "name":
          return a.name.localeCompare(b.name, "vi");
        case "created":
          return b.createdAtMs - a.createdAtMs;
        case "average":
          return b.averagePoints - a.averagePoints || b.totalPoints - a.totalPoints;
      }
    });
  }, [groups, query, onlyAttention, sortKey]);

  function toggleSelected(id: string) {
    setRawSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allAssignableSelected =
    assignableGroups.length > 0 && selected.length === assignableGroups.length;

  function toggleSelectAll() {
    setRawSelection(allAssignableSelected ? new Set() : new Set(assignableGroups.map((g) => g.id)));
  }

  const assignHref = `/admin/groups/assign?groups=${selected.map((g) => g.id).join(",")}`;

  return (
    <div className="space-y-4">
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nhóm hoặc trưởng nhóm..."
            aria-label="Tìm nhóm"
            className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setOnlyAttention(false)}
            aria-pressed={!onlyAttention}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              !onlyAttention
                ? "border-primary-border bg-primary-bg text-primary"
                : "border-border-strong text-muted hover:bg-surface-hover"
            }`}
          >
            Tất cả · {groups.length}
          </button>
          <button
            type="button"
            onClick={() => setOnlyAttention(true)}
            aria-pressed={onlyAttention}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              onlyAttention
                ? "border-primary-border bg-primary-bg text-primary"
                : "border-border-strong text-muted hover:bg-surface-hover"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Cần xử lý · {attentionCount}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Sắp xếp"
            className="rounded-lg border border-border-strong bg-surface px-2.5 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                Sắp xếp: {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <ViewToggle mode={view} onChange={setView} />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Không có nhóm nào khớp bộ lọc.
        </p>
      ) : view === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((group) => (
            <GroupGridCard
              key={group.id}
              group={group}
              selected={rawSelection.has(group.id)}
              onToggleSelected={() => toggleSelected(group.id)}
              menuOpen={openMenuId === group.id}
              onMenuToggle={() => setOpenMenuId((id) => (id === group.id ? null : group.id))}
              onMenuClose={closeMenu}
              onRename={() => setRenameTarget(group)}
              onDelete={() => setDeleteTarget(group)}
              disabled={pending}
            />
          ))}
        </div>
      ) : (
        <GroupTable
          groups={visible}
          selection={rawSelection}
          allSelected={allAssignableSelected}
          onToggleSelected={toggleSelected}
          onToggleAll={toggleSelectAll}
          openMenuId={openMenuId}
          onMenuToggle={(id) => setOpenMenuId((current) => (current === id ? null : id))}
          onMenuClose={closeMenu}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
          disabled={pending}
        />
      )}

      {/* Thanh hành động khi đã chọn nhóm */}
      {selected.length > 0 && (
        // Negative margins cancel MainContent's own px-4 sm:px-8 so the bar
        // reaches the edges of the content column instead of floating inside it.
        <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-surface px-4 py-3 shadow-[0_-6px_24px_rgba(15,23,42,0.10)] sm:-mx-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-primary px-2 text-sm font-bold text-primary-foreground">
              {selected.length}
            </span>
            <span className="text-sm font-semibold text-foreground">
              nhóm được chọn{" "}
              <span className="font-normal text-muted">· {selectedMemberTotal} thành viên sẽ nhận nhiệm vụ</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRawSelection(new Set())}>
                Bỏ chọn
              </Button>
              <Link
                href={assignHref}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                <CalendarCheck className="h-4 w-4" />
                Giao việc cho {selected.length} nhóm
              </Link>
            </div>
          </div>
        </div>
      )}

      {renameTarget && (
        <RenameGroupDialog
          group={renameTarget}
          onClose={() => setRenameTarget(null)}
          onDone={() => {
            setRenameTarget(null);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {deleteTarget && (
        <DeleteGroupDialog
          group={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDone={() => {
            setDeleteTarget(null);
            setRawSelection(new Set());
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Thẻ nhóm (dạng lưới) ─────────────────────── */

function GroupGridCard({
  group,
  selected,
  onToggleSelected,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onRename,
  onDelete,
  disabled,
}: {
  group: GroupCard;
  selected: boolean;
  onToggleSelected: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const isEmpty = group.memberCount === 0;
  const percent = todayPercent(group);

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        isEmpty
          ? "border-dashed border-warning-border bg-warning-bg"
          : selected
            ? "border-primary bg-surface ring-2 ring-primary-bg"
            : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          disabled={isEmpty}
          onChange={onToggleSelected}
          aria-label={isEmpty ? `${group.name} chưa có thành viên, không thể chọn` : `Chọn ${group.name}`}
          title={isEmpty ? "Nhóm chưa có thành viên" : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-foreground" title={group.name}>
            {group.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            Tạo ngày {group.createdAtLabel}
            {isEmpty && " · chưa xếp hạng"}
          </p>
        </div>
        {!isEmpty && group.rank !== null && <RankBadge rank={group.rank} />}
        <GroupMenu
          group={group}
          open={menuOpen}
          onToggle={onMenuToggle}
          onClose={onMenuClose}
          onRename={onRename}
          onDelete={onDelete}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center gap-2.5">
        {group.leaderName ? (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-bg text-primary">
              <Crown className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-faint">Trưởng nhóm</p>
              <p className="truncate text-sm font-semibold text-foreground">{group.leaderName}</p>
            </div>
          </>
        ) : (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-faint">Trưởng nhóm</p>
              <p className="truncate text-sm font-semibold text-warning">Chưa chỉ định</p>
            </div>
          </>
        )}
        {group.deputyCount > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-info">
            +{group.deputyCount} phó nhóm
          </span>
        )}
      </div>

      {isEmpty ? (
        <>
          <p className="text-xs text-muted">
            Nhóm chưa có thành viên nên không nhận được nhiệm vụ nào. Thêm thành viên để bắt đầu.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 border-t border-warning-border pt-3">
            <Link
              href={`/admin/groups/${group.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Thêm thành viên
            </Link>
            <Link
              href={`/admin/groups/${group.id}`}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover"
            >
              Chỉ định trưởng nhóm
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <AvatarStack members={group.previewMembers} total={group.memberCount} />
            <span className="text-xs text-muted">
              <strong className="font-bold text-foreground">{group.memberCount}</strong> thành viên
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between text-xs text-muted">
              <span>Nhiệm vụ hôm nay</span>
              <span className="font-bold text-foreground">
                {group.todayTotal > 0
                  ? `${group.todayDone}/${group.todayTotal} · ${Math.round(percent * 100)}%`
                  : "Không có nhiệm vụ"}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-faint-bg">
              <div
                className={`h-full rounded-full ${meterTone(percent)}`}
                style={{ width: `${group.todayTotal > 0 ? Math.round(percent * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="leading-tight">
              <span className="block text-sm font-bold text-accent-hover">
                {formatPointsVN(group.averagePoints)}đ/người
              </span>
              <span className="block text-[11px] text-muted">tổng {group.totalPoints}đ tuần này</span>
            </span>
            {group.pendingExplanations > 0 && (
              <Link
                href={`/admin/groups/${group.id}`}
                className="rounded-full border border-warning-border bg-warning-bg px-2.5 py-1 text-[11px] font-bold text-warning hover:brightness-95"
              >
                {group.pendingExplanations} chờ duyệt
              </Link>
            )}
            <Link
              href={`/admin/groups/${group.id}`}
              className="ml-auto text-sm font-semibold text-primary hover:underline"
            >
              Xem chi tiết
            </Link>
          </div>
        </>
      )}
    </article>
  );
}

/* ───────────────────────────── Bảng ──────────────────────────────────── */

function GroupTable({
  groups,
  selection,
  allSelected,
  onToggleSelected,
  onToggleAll,
  openMenuId,
  onMenuToggle,
  onMenuClose,
  onRename,
  onDelete,
  disabled,
}: {
  groups: GroupCard[];
  selection: Set<string>;
  allSelected: boolean;
  onToggleSelected: (id: string) => void;
  onToggleAll: () => void;
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onRename: (group: GroupCard) => void;
  onDelete: (group: GroupCard) => void;
  disabled: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full whitespace-nowrap text-sm">
        <thead className="bg-surface-hover text-left text-xs font-semibold uppercase text-muted">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Chọn tất cả nhóm có thành viên"
                className="h-4 w-4 accent-primary"
              />
            </th>
            <th className="px-4 py-3">Nhóm</th>
            <th className="px-4 py-3">Trưởng nhóm</th>
            <th className="px-4 py-3">Thành viên</th>
            <th className="px-4 py-3">Nhiệm vụ hôm nay</th>
            <th className="px-4 py-3">Điểm/người</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {groups.map((group) => {
            const isEmpty = group.memberCount === 0;
            const percent = todayPercent(group);
            const selected = selection.has(group.id);
            return (
              <tr key={group.id} className={isEmpty ? "bg-warning-bg" : selected ? "bg-primary-bg-subtle" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected && !isEmpty}
                    disabled={isEmpty}
                    onChange={() => onToggleSelected(group.id)}
                    aria-label={isEmpty ? `${group.name} chưa có thành viên, không thể chọn` : `Chọn ${group.name}`}
                    className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isEmpty ? "bg-warning-bg text-warning" : "bg-primary-bg text-primary"
                      }`}
                    >
                      {isEmpty ? <AlertTriangle className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">{group.name}</span>
                      <span className="block text-xs text-faint">
                        Tạo {group.createdAtLabel}
                        {isEmpty && " · chưa xếp hạng"}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  {group.leaderName ? (
                    <span className="text-foreground">
                      {group.leaderName}
                      {group.deputyCount > 0 && (
                        <span className="block text-xs text-muted">+{group.deputyCount} phó nhóm</span>
                      )}
                    </span>
                  ) : (
                    <Link href={`/admin/groups/${group.id}`} className="text-sm font-semibold text-warning hover:underline">
                      Chỉ định →
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isEmpty ? (
                    <Link href={`/admin/groups/${group.id}`} className="text-sm font-semibold text-primary hover:underline">
                      + Thêm thành viên
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2">
                      <AvatarStack members={group.previewMembers.slice(0, 3)} total={group.memberCount} max={3} />
                      <strong className="font-bold text-foreground">{group.memberCount}</strong>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {group.todayTotal > 0 ? (
                    <span className="block w-32">
                      <span className="mb-1 block h-1.5 overflow-hidden rounded-full bg-faint-bg">
                        <span
                          className={`block h-full rounded-full ${meterTone(percent)}`}
                          style={{ width: `${Math.round(percent * 100)}%` }}
                        />
                      </span>
                      <span className="text-xs text-muted">
                        {group.todayDone}/{group.todayTotal} · {Math.round(percent * 100)}%
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-faint">Không có nhiệm vụ</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isEmpty ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <span className="leading-tight">
                      <span className="flex items-center gap-1 text-sm font-bold text-accent-hover">
                        {group.rank === 1 && <Trophy className="h-3.5 w-3.5" />}
                        {formatPointsVN(group.averagePoints)}đ
                      </span>
                      <span className="block text-[11px] text-muted">tổng {group.totalPoints}đ</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center justify-end gap-2">
                    {group.pendingExplanations > 0 && (
                      <Link
                        href={`/admin/groups/${group.id}`}
                        className="rounded-full border border-warning-border bg-warning-bg px-2 py-0.5 text-[11px] font-bold text-warning"
                      >
                        {group.pendingExplanations} chờ
                      </Link>
                    )}
                    <Link href={`/admin/groups/${group.id}`} className="text-sm font-semibold text-primary hover:underline">
                      Xem chi tiết
                    </Link>
                    <GroupMenu
                      group={group}
                      open={openMenuId === group.id}
                      onToggle={() => onMenuToggle(group.id)}
                      onClose={onMenuClose}
                      onRename={() => onRename(group)}
                      onDelete={() => onDelete(group)}
                      disabled={disabled}
                    />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────── Mảnh dùng chung ──────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        rank === 1 ? "border border-accent-border bg-accent-bg text-accent-hover" : "bg-faint-bg text-muted"
      }`}
    >
      {rank === 1 && <Trophy className="h-3 w-3" />}#{rank}
    </span>
  );
}

function AvatarStack({
  members,
  total,
  max = 6,
}: {
  members: { id: string; name: string; avatarUrl: string | null }[];
  total: number;
  max?: number;
}) {
  const shown = members.slice(0, max);
  const rest = total - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((member, index) => (
        <span
          key={member.id}
          className="rounded-full ring-2 ring-surface"
          style={{ marginLeft: index === 0 ? 0 : -8 }}
          title={member.name}
        >
          <UserAvatar src={member.avatarUrl} name={member.name} size={26} className="text-[10px]" />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="flex h-[26px] items-center justify-center rounded-full bg-faint-bg px-1.5 text-[10px] font-bold text-muted ring-2 ring-surface"
          style={{ marginLeft: -8 }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

const MENU_WIDTH = 224;

// The dropdown renders through a portal with fixed coordinates rather than as
// an absolutely-positioned child. In list view its trigger sits inside the
// table's `overflow-x-auto` wrapper — and a container with `overflow-x: auto`
// resolves `overflow-y: visible` to `auto` too, so an in-flow dropdown gets
// clipped at the table's edge exactly on the last rows, where it opens
// downward. A portal is immune to any ancestor's overflow.
function GroupMenu({
  group,
  open,
  onToggle,
  onClose,
  onRename,
  onDelete,
  disabled,
}: {
  group: GroupCard;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Measured in the click handler, not in an effect: the rect is only ever
  // needed in response to this exact interaction, and measuring here keeps
  // the open flag and its coordinates in the same render instead of paying
  // for a second pass to place a menu that's already on screen.
  function handleToggle() {
    const button = buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        // Right-aligned to the trigger, but never past the left viewport edge.
        left: Math.max(8, rect.right - MENU_WIDTH),
      });
    }
    onToggle();
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    // Fixed coordinates go stale the moment anything moves underneath, and a
    // detached menu floating next to the wrong row is worse than no menu.
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thao tác khác cho ${group.name}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-50 rounded-xl border border-border bg-surface p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onRename();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
            >
              <Pencil className="h-4 w-4 text-muted" />
              Đổi tên nhóm
            </button>
            <Link
              role="menuitem"
              href={`/admin/groups/${group.id}/tasks/new`}
              onClick={onClose}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
            >
              <CalendarCheck className="h-4 w-4 text-muted" />
              Giao việc cho riêng nhóm này
            </Link>
            <hr className="my-1 border-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-danger hover:bg-danger-bg"
            >
              <Trash2 className="h-4 w-4" />
              Xoá nhóm
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

function RenameGroupDialog({
  group,
  onClose,
  onDone,
}: {
  group: GroupCard;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const err = await renameGroupAction(group.id, name);
      if (err) {
        setError(err);
        return;
      }
      onDone();
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-base font-semibold text-foreground">Đổi tên nhóm</h2>
      <div className="mt-4">
        <Input
          label="Tên nhóm"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) submit();
          }}
          error={error}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="button" disabled={!name.trim() || name.trim() === group.name} isLoading={pending} onClick={submit}>
          Lưu tên mới
        </Button>
      </div>
    </ModalShell>
  );
}

// Type-to-confirm rather than a plain yes/no: deleting a group cascades
// through every task and every completion/explanation row its members ever
// produced, and unlike removing one member there's nothing to undo it with.
function DeleteGroupDialog({
  group,
  onClose,
  onDone,
}: {
  group: GroupCard;
  onClose: () => void;
  onDone: () => void;
}) {
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const matches = confirmName.trim() === group.name;

  function submit() {
    if (!matches) return;
    setError(undefined);
    startTransition(async () => {
      const err = await deleteGroupAction(group.id, confirmName);
      if (err) {
        setError(err);
        return;
      }
      onDone();
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-base font-semibold text-foreground">
        Xoá nhóm &ldquo;{group.name}&rdquo;?
      </h2>
      <div className="mt-3 rounded-lg border border-danger-border bg-danger-bg px-3.5 py-3">
        <p className="text-sm font-bold text-danger">Thao tác này không thể hoàn tác.</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted">
          <li>
            {group.memberCount === 0
              ? "Nhóm chưa có thành viên nào"
              : `${group.memberCount} thành viên sẽ bị đưa ra khỏi nhóm`}
          </li>
          <li>Mọi nhiệm vụ hàng ngày của nhóm sẽ bị xoá</li>
          <li>Toàn bộ lịch sử hoàn thành &amp; giải trình sẽ mất theo</li>
        </ul>
      </div>
      <div className="mt-4">
        <Input
          label={`Gõ đúng "${group.name}" để xác nhận`}
          value={confirmName}
          autoFocus
          autoComplete="off"
          placeholder="Nhập tên nhóm..."
          onChange={(e) => setConfirmName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches) submit();
          }}
          error={error}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="button" variant="danger" disabled={!matches} isLoading={pending} onClick={submit}>
          Xoá nhóm
        </Button>
      </div>
    </ModalShell>
  );
}
