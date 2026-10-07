"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MoreHorizontal, Network, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NETWORK_STATUS_CONFIG, NETWORK_STATUS_ORDER, type NetworkStatus } from "@/lib/network-status";
import {
  DEFAULT_SORT,
  clampPage,
  pageOfIndex,
  sortMembers,
  visibleSelection,
  type EditableFields,
  type SortKey,
  type SortState,
} from "@/lib/network-table";
import {
  branchLabel,
  descendantIds,
  foldName,
  isValidIgniteId,
  type NetworkMemberLite,
  type NetworkTree,
} from "@/lib/network-tree";
import { CellPicker } from "./cell-picker";
import type { MemberFormValues } from "./member-form-modal";
import { InitialsAvatar, StatusPill, idLabel } from "./network-ui";
import { EditableText, Pager } from "./table-parts";

// full     every column, the table has the whole width
// compact  the table shares the screen with the map: only the columns an admin edits, with
//          the RapidX ID under the name so the Leader and referrer both stay in view
// phone    name and status; the Leader sits under the name, the rest is in "Sửa chi tiết" in the row menu
export type TableMode = "full" | "compact" | "phone";

type ColumnKey = "no" | "name" | "id" | "status" | "team" | "leader" | "referrer" | "branch" | "downline";

const COLUMNS: Record<TableMode, ColumnKey[]> = {
  full: ["no", "name", "id", "status", "team", "leader", "referrer", "branch", "downline"],
  compact: ["name", "status", "leader", "referrer"],
  phone: ["name", "status"],
};

const HEADERS: Record<ColumnKey, { label: string; sort?: SortKey }> = {
  no: { label: "#" },
  name: { label: "Họ tên", sort: "name" },
  id: { label: "RapidX ID" },
  status: { label: "Trạng thái", sort: "status" },
  team: { label: "Team" },
  leader: { label: "Leader", sort: "leader" },
  referrer: { label: "Người giới thiệu" },
  branch: { label: "Nhánh", sort: "branch" },
  downline: { label: "Downline", sort: "downline" },
};

const TEAMS_LIST = "tn-teams";
const rowDomId = (id: string) => `tn-row-${id}`;

// Layout facts shared by header and body cells. The last column (the row's buttons)
// stays put while the rest scrolls sideways, so it is always within reach.
const CELL = "border-b border-border px-2.5 py-1.5 align-middle whitespace-nowrap";
const STICKY_END = "sticky right-0 z-10 bg-inherit shadow-[-10px_0_8px_-8px_rgba(0,0,0,0.55)]";

type Props = {
  /** Everyone, for the pickers and the "already taken" checks. */
  members: readonly NetworkMemberLite[];
  /** The people to list: everyone who passes the page's filters. */
  rows: readonly NetworkMemberLite[];
  byId: ReadonlyMap<string, NetworkMemberLite>;
  /** The tree being shown: the Downline column and the sort by it count in this one. */
  tree: NetworkTree;
  leaderTree: NetworkTree;
  referrerTree: NetworkTree;
  heads: ReadonlyMap<string, string | null>;
  teams: readonly string[];
  mode: TableMode;
  selectedId: string | null;
  /** Show the empty row at the top for adding someone. */
  adding: boolean;
  filtersActive: boolean;
  onAddingChange: (adding: boolean) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onLocate: (id: string) => void;
  onMenu: (id: string, anchor: DOMRect) => void;
  onStatus: (id: string) => void;
  onPatch: (member: NetworkMemberLite, patch: Partial<EditableFields>) => void;
  /** Resolves to an error message, or nothing when the member was created. */
  onCreate: (values: MemberFormValues) => Promise<string | undefined>;
  onAssign: (ids: string[], leaderId: string) => void;
  /** Resolves to whether the admin went ahead and they were deleted. */
  onDeleteMany: (ids: string[]) => Promise<boolean>;
  onClearFilters: () => void;
};

// The table is the editing surface: every row is a person, and the Leader and
// referrer columns are what the map is drawn from. It owns only how the list is shown
// (sort, page, ticks); the member list itself belongs to the page, so a change made here
// and a change made on the map are the same change.
export function MemberTable(props: Props) {
  const {
    members, rows, byId, tree, leaderTree, referrerTree, heads, teams, mode, selectedId, adding, filtersActive,
    onAddingChange, onSelect, onHover, onLocate, onMenu, onStatus, onPatch, onCreate, onAssign, onDeleteMany, onClearFilters,
  } = props;
  const columns = COLUMNS[mode];
  const phone = mode === "phone";
  const stacked = mode !== "full";
  const CELL_ = mode === "full" ? CELL : CELL.replace("px-2.5", "px-2");
  const pickerWidth = mode === "full" ? "max-w-[14rem]" : "max-w-[8rem]";

  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [size, setSize] = useState(25);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [followId, setFollowId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      sortMembers(rows, sort, {
        byId,
        branchOf: (m) => branchLabel(m, heads, byId),
        downline: (id) => tree.descendants.get(id) ?? 0,
      }),
    [rows, sort, byId, heads, tree]
  );
  const current = clampPage(page, sorted.length, size);
  const slice = sorted.slice((current - 1) * size, current * size);
  const ticked = useMemo(() => visibleSelection(picked, sorted), [picked, sorted]);

  // Keep the person who matters in view. Two reasons the page can need to change: they
  // were selected somewhere else (a card on the map), or the edit just made moved them
  // under the current sort (renaming "AN" to "ZZ"). Both adjust state while rendering,
  // which React allows for a component's own state and which avoids a frame showing the
  // wrong page.
  const [seenSelected, setSeenSelected] = useState(selectedId);
  if (selectedId !== seenSelected) {
    setSeenSelected(selectedId);
    const at = selectedId ? sorted.findIndex((m) => m.id === selectedId) : -1;
    if (at >= 0) setPage(pageOfIndex(at, size));
  }
  if (followId) {
    setFollowId(null);
    const at = sorted.findIndex((m) => m.id === followId);
    if (at >= 0) setPage(pageOfIndex(at, size));
  }

  useEffect(() => {
    if (selectedId) document.getElementById(rowDomId(selectedId))?.scrollIntoView({ block: "nearest" });
  }, [selectedId, current]);

  function changeSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(1);
  }

  function setTicked(ids: readonly string[], on: boolean) {
    setPicked((now) => {
      const next = new Set(now);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const pageSelectable = slice.filter((m) => !m.isRoot);
  const allOnPage = pageSelectable.length > 0 && pageSelectable.every((m) => picked.has(m.id));

  // Who may not be a member's leader / referrer: themself and everyone below them in
  // that tree. Worked out when a picker opens.
  const withoutBelow = (tr: NetworkTree, ids: readonly string[]) => (): ReadonlySet<string> => {
    const out = new Set<string>(ids);
    for (const id of ids) for (const d of descendantIds(tr.kids, id)) out.add(d);
    return out;
  };

  function patchText(member: NetworkMemberLite, patch: Partial<EditableFields>) {
    setFollowId(member.id);
    onPatch(member, patch);
  }

  const validateName = (v: string) => (!v ? "Hãy nhập họ tên." : v.length > 120 ? "Họ tên tối đa 120 ký tự." : null);
  const validateTeam = (v: string) => (v.length > 60 ? "Team tối đa 60 ký tự." : null);
  const validateId = (member: NetworkMemberLite) => (v: string) => {
    if (!v) return null;
    const code = v.toUpperCase();
    if (!isValidIgniteId(code)) return "RapidX ID phải có dạng DIA + 7 chữ số, ví dụ DIA1234567.";
    const owner = members.find((o) => o.igniteId === code && o.id !== member.id);
    return owner ? `RapidX ID ${code} đã thuộc về ${owner.name}.` : null;
  };

  // The Leader cell: a picker, or a note for the root. Also used under the name on a phone.
  function leaderControl(m: NetworkMemberLite) {
    if (m.isRoot) return <span className="px-1.5 text-faint">Không có (gốc)</span>;
    return (
      <CellPicker
        members={members}
        value={m.leaderId}
        ariaLabel={`Leader của ${m.name}`}
        noneLabel="Chưa có Leader (UNASSIGNED)"
        note={`Người nằm dưới ${m.name} không có trong danh sách, để tránh vòng lặp.`}
        excluded={withoutBelow(leaderTree, [m.id])}
        className={pickerWidth}
        trigger={
          m.leaderId && byId.get(m.leaderId) ? (
            <span className="truncate" title={byId.get(m.leaderId)!.name}>{byId.get(m.leaderId)!.name}</span>
          ) : (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10.5px] font-semibold text-warning">Chưa có Leader</span>
          )
        }
        onPick={(id) => {
          if (id === m.leaderId) return;
          setFollowId(m.id);
          onPatch(m, { leaderId: id });
        }}
      />
    );
  }

  function renderCell(key: ColumnKey, m: NetworkMemberLite, index: number) {
    switch (key) {
      case "no":
        return <td key={key} className={`${CELL_} w-9 tabular-nums text-faint`}>{index}</td>;
      case "name":
        return (
          <td key={key} className={CELL_}>
            <div className="flex min-w-0 items-center gap-2">
              {!stacked && <InitialsAvatar name={m.name} size={26} />}
              <div className={`min-w-0 ${stacked ? "max-w-[9.5rem]" : "max-w-[15rem]"}`}>
                <div className="min-w-0">
                  <EditableText
                    value={m.name}
                    display={m.name}
                    ariaLabel={`họ tên của ${m.name}`}
                    validate={validateName}
                    onCommit={(v) => patchText(m, { name: v })}
                  />
                </div>
                {phone && (
                  <>
                    <p className="truncate px-1.5 font-mono text-[11px] text-muted">{idLabel(m.igniteId)}</p>
                    <div className="flex min-w-0 items-center text-xs text-muted">
                      <span className="shrink-0 pl-1.5">Leader:</span>
                      {leaderControl(m)}
                    </div>
                  </>
                )}
                {mode === "compact" && (
                  // Its own block, or the button sits beside the name instead of under it.
                  <div className="min-w-0">
                    <EditableText
                      value={m.igniteId ?? ""}
                      display={m.igniteId ?? <span className="font-sans text-faint">Chưa có ID</span>}
                      ariaLabel={`RapidX ID của ${m.name}`}
                      mono
                      validate={validateId(m)}
                      onCommit={(v) => patchText(m, { igniteId: v ? v.toUpperCase() : null })}
                    />
                  </div>
                )}
              </div>
              {m.isRoot && <span className="shrink-0 rounded-full bg-faint-bg px-2 py-0.5 text-[10.5px] font-semibold text-muted">Gốc</span>}
            </div>
          </td>
        );
      case "id":
        return (
          <td key={key} className={CELL_}>
            <EditableText
              value={m.igniteId ?? ""}
              display={m.igniteId ?? <span className="font-sans text-faint">Chưa có ID</span>}
              ariaLabel={`RapidX ID của ${m.name}`}
              mono
              validate={validateId(m)}
              onCommit={(v) => patchText(m, { igniteId: v ? v.toUpperCase() : null })}
            />
          </td>
        );
      case "status":
        return (
          <td key={key} className={CELL_}>
            <button type="button" onClick={() => onStatus(m.id)} aria-label={`Đổi trạng thái của ${m.name}`} title="Đổi trạng thái (có ghi lịch sử)" className="rounded-full hover:brightness-125">
              <StatusPill status={m.status} />
            </button>
          </td>
        );
      case "team":
        return (
          <td key={key} className={CELL_}>
            <EditableText
              value={m.team ?? ""}
              display={m.team ?? <span className="text-faint">—</span>}
              ariaLabel={`team của ${m.name}`}
              listId={TEAMS_LIST}
              validate={validateTeam}
              onCommit={(v) => patchText(m, { team: v || null })}
            />
          </td>
        );
      case "leader":
        return (
          <td key={key} className={CELL_}>
            {leaderControl(m)}
          </td>
        );
      case "referrer":
        return (
          <td key={key} className={CELL_}>
            <CellPicker
              members={members}
              value={m.referrerId}
              ariaLabel={`Người giới thiệu của ${m.name}`}
              noneLabel="Không có người giới thiệu"
              note="Chỉ đổi cây Giới thiệu, cây Tổ chức giữ nguyên."
              excluded={withoutBelow(referrerTree, [m.id])}
              className={pickerWidth}
              trigger={
                m.referrerId && byId.get(m.referrerId) ? (
                  <span className="truncate" title={byId.get(m.referrerId)!.name}>{byId.get(m.referrerId)!.name}</span>
                ) : (
                  <span className="text-faint">Không có</span>
                )
              }
              onPick={(id) => {
                if (id === m.referrerId) return;
                setFollowId(m.id);
                onPatch(m, { referrerId: id });
              }}
            />
          </td>
        );
      case "branch":
        return (
          <td key={key} className={`${CELL_} text-muted`} title="Tự tính theo Leader, không nhập tay">
            {branchLabel(m, heads, byId)}
          </td>
        );
      case "downline":
        return (
          <td key={key} className={`${CELL_} tabular-nums text-muted`} title="Tổng số người bên dưới trong cây đang xem">
            {tree.descendants.get(m.id) ?? 0}
          </td>
        );
    }
  }

  async function deleteTicked() {
    if (await onDeleteMany(ticked)) setTicked(ticked, false);
  }

  const colSpan = columns.length + (phone ? 1 : 2);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {ticked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-primary-border bg-primary-bg px-3 py-2 text-sm">
          <span>
            Đã chọn <b className="tabular-nums">{ticked.length}</b>
          </span>
          <CellPicker
            members={members}
            value={null}
            allowNone={false}
            ariaLabel="Gán Leader cho những người đã chọn"
            noneLabel=""
            note="Không hiện những người nằm dưới người đã chọn, để tránh vòng lặp."
            excluded={withoutBelow(leaderTree, ticked)}
            className="border-border bg-surface px-2.5 py-1 font-medium text-foreground"
            trigger={<span>Gán Leader…</span>}
            onPick={(id) => {
              if (!id) return;
              const ids = ticked;
              setTicked(ids, false);
              onAssign(ids, id);
            }}
          />
          <Button type="button" size="sm" variant="danger" onClick={() => void deleteTicked()}>
            Xóa…
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setTicked(ticked, false)}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* scroll-pt: the header row sticks to the top, so a row scrolled "into view" must stop below it. */}
      <div className="min-h-0 flex-1 scroll-pt-10 overflow-auto" onMouseLeave={() => onHover(null)}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Danh sách thành viên mạng lưới</caption>
          <thead>
            <tr className="bg-surface">
              {!phone && (
                <th scope="col" className="sticky top-0 z-20 w-9 border-b border-border-strong bg-surface px-2.5 py-2">
                  <input
                    type="checkbox"
                    aria-label="Chọn cả trang này"
                    checked={allOnPage}
                    disabled={pageSelectable.length === 0}
                    onChange={() => setTicked(pageSelectable.map((m) => m.id), !allOnPage)}
                    className="h-4 w-4 accent-primary"
                  />
                </th>
              )}
              {columns.map((key) => {
                const header = HEADERS[key];
                const active = header.sort !== undefined && sort.key === header.sort;
                return (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : header.sort ? "none" : undefined}
                    className="sticky top-0 z-20 whitespace-nowrap border-b border-border-strong bg-surface px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted"
                  >
                    {header.sort ? (
                      <button type="button" onClick={() => changeSort(header.sort!)} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground">
                        {key === "name" && mode === "compact" ? "Họ tên · ID" : header.label}
                        {active && <span aria-hidden="true" className="text-primary">{sort.dir === 1 ? "▲" : "▼"}</span>}
                      </button>
                    ) : (
                      header.label
                    )}
                  </th>
                );
              })}
              <th scope="col" className="sticky right-0 top-0 z-30 w-[4.5rem] border-b border-border-strong bg-surface px-2.5 py-2">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {adding && !phone && (
              <DraftRow
                columns={columns}
                members={members}
                onSubmit={onCreate}
                onCancel={() => onAddingChange(false)}
                onDone={() => onAddingChange(false)}
              />
            )}
            {slice.map((m, i) => {
              const selected = m.id === selectedId;
              return (
                <tr
                  key={m.id}
                  id={rowDomId(m.id)}
                  aria-current={selected ? "true" : undefined}
                  onMouseEnter={() => onHover(m.id)}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button, input, select, textarea, a, label")) return;
                    onSelect(m.id);
                  }}
                  className={`group cursor-default ${selected ? "bg-surface-hover shadow-[inset_3px_0_0_var(--primary)]" : "bg-background hover:bg-surface"}`}
                >
                  {!phone && (
                    <td className={`${CELL_} w-9`}>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${m.name}`}
                        checked={picked.has(m.id)}
                        disabled={m.isRoot}
                        title={m.isRoot ? "Gốc mạng lưới không xóa hay gán Leader được" : undefined}
                        onChange={(e) => setTicked([m.id], e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                  )}
                  {columns.map((key) => renderCell(key, m, (current - 1) * size + i + 1))}
                  <td className={`${CELL_} ${STICKY_END}`}>
                    <div className="flex justify-end gap-0.5">
                      {!phone && (
                        <button
                          type="button"
                          onClick={() => onLocate(m.id)}
                          aria-label={`Xem ${m.name} trên sơ đồ`}
                          title="Xem trên sơ đồ"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-faint-bg hover:text-foreground"
                        >
                          <Network className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => onMenu(m.id, e.currentTarget.getBoundingClientRect())}
                        aria-label={`Thao tác với ${m.name}`}
                        aria-haspopup="menu"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-faint-bg hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {slice.length === 0 && !adding && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted">
                  {filtersActive ? (
                    <>
                      Không có thành viên nào khớp bộ lọc hiện tại.
                      <div className="mt-3">
                        <Button type="button" size="sm" onClick={onClearFilters}>
                          Xóa bộ lọc
                        </Button>
                      </div>
                    </>
                  ) : (
                    "Chưa có thành viên nào."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <datalist id={TEAMS_LIST}>
          {teams.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <Pager
        total={sorted.length}
        page={current}
        size={size}
        onPage={setPage}
        onSize={(n) => {
          setSize(n);
          setPage(1);
        }}
      />
    </div>
  );
}

// The empty row at the top of the table. Same rules as the add form: the referrer is
// picked first and the leader follows it until the admin picks a leader themself.
function DraftRow({
  columns,
  members,
  onSubmit,
  onCancel,
  onDone,
}: {
  columns: ColumnKey[];
  members: readonly NetworkMemberLite[];
  onSubmit: (values: MemberFormValues) => Promise<string | undefined>;
  onCancel: () => void;
  onDone: () => void;
}) {
  // Same padding as the rows around it: tighter when the ID column is folded into the name.
  const CELL_ = columns.includes("id") ? CELL : CELL.replace("px-2.5", "px-2");
  const [name, setName] = useState("");
  const [igniteId, setIgniteId] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState<NetworkStatus>("CUSTOMER");
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [leaderTouched, setLeaderTouched] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const sameName = useMemo(() => {
    const folded = foldName(name);
    return folded ? (members.find((m) => foldName(m.name) === folded) ?? null) : null;
  }, [name, members]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Hãy nhập họ tên.");
    const code = igniteId.trim().toUpperCase();
    if (code) {
      if (!isValidIgniteId(code)) return setError("RapidX ID phải có dạng DIA + 7 chữ số, ví dụ DIA1234567.");
      const owner = members.find((m) => m.igniteId === code);
      if (owner) return setError(`RapidX ID ${code} đã thuộc về ${owner.name}.`);
    }
    if (team.trim().length > 60) return setError("Team tối đa 60 ký tự.");
    setError(undefined);
    setPending(true);
    const message = await onSubmit({ name: trimmed, igniteId: code || null, team: team.trim() || null, leaderId, referrerId, status });
    setPending(false);
    if (message) setError(message);
    else onDone();
  }

  const field = "w-full min-w-[5.5rem] rounded-md border border-primary bg-background px-2 py-1 text-sm text-foreground focus:outline-none";
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  function cell(key: ColumnKey) {
    switch (key) {
      case "no":
        return <td key={key} className={`${CELL_} text-primary`}>+</td>;
      case "name":
        return (
          <td key={key} className={CELL_}>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} placeholder="Họ tên (bắt buộc)" aria-label="Họ tên" autoComplete="off" className={`${field} min-w-[9rem]`} />
            {!columns.includes("id") && (
              <input value={igniteId} onChange={(e) => setIgniteId(e.target.value)} onKeyDown={onKey} placeholder="RapidX ID: DIA1234567" aria-label="RapidX ID" autoComplete="off" className={`${field} mt-1 font-mono text-xs`} />
            )}
          </td>
        );
      case "id":
        return (
          <td key={key} className={CELL_}>
            <input value={igniteId} onChange={(e) => setIgniteId(e.target.value)} onKeyDown={onKey} placeholder="DIA1234567" aria-label="RapidX ID" autoComplete="off" className={`${field} font-mono text-xs`} />
          </td>
        );
      case "status":
        return (
          <td key={key} className={CELL_}>
            <select value={status} onChange={(e) => setStatus(e.target.value as NetworkStatus)} aria-label="Trạng thái ban đầu" className={field}>
              {NETWORK_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {NETWORK_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
          </td>
        );
      case "team":
        return (
          <td key={key} className={CELL_}>
            <input value={team} onChange={(e) => setTeam(e.target.value)} onKeyDown={onKey} list={TEAMS_LIST} placeholder="Team" aria-label="Team" autoComplete="off" className={field} />
          </td>
        );
      case "leader":
        return (
          <td key={key} className={CELL_}>
            <CellPicker
              members={members}
              value={leaderId}
              ariaLabel="Leader"
              noneLabel="Chưa có Leader (UNASSIGNED)"
              className="max-w-[8rem] border-border-strong"
              trigger={leaderId && byId.get(leaderId) ? <span className="truncate">{byId.get(leaderId)!.name}</span> : <span className="text-warning">Chưa có Leader</span>}
              onPick={(id) => {
                setLeaderTouched(true);
                setLeaderId(id);
              }}
            />
          </td>
        );
      case "referrer":
        return (
          <td key={key} className={CELL_}>
            <CellPicker
              members={members}
              value={referrerId}
              ariaLabel="Người giới thiệu"
              noneLabel="Không có người giới thiệu"
              className="max-w-[8rem] border-border-strong"
              trigger={referrerId && byId.get(referrerId) ? <span className="truncate">{byId.get(referrerId)!.name}</span> : <span className="text-muted">Chọn trước…</span>}
              onPick={(id) => {
                setReferrerId(id);
                if (!leaderTouched) setLeaderId(id);
              }}
            />
          </td>
        );
      default:
        return <td key={key} className={CELL} />;
    }
  }

  return (
    <>
      <tr className="bg-primary-bg">
        <td className={CELL} />
        {columns.map(cell)}
        <td className={`${CELL} ${STICKY_END} bg-surface`}>
          <div className="flex justify-end gap-0.5">
            <button type="button" onClick={() => void submit()} disabled={pending} aria-label="Lưu thành viên mới" title="Lưu" className="flex h-7 w-7 items-center justify-center rounded-md text-success hover:bg-faint-bg disabled:opacity-50">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={onCancel} disabled={pending} aria-label="Hủy thêm" title="Hủy" className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-faint-bg disabled:opacity-50">
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      <tr className="bg-primary-bg">
        <td className="border-b border-border px-2.5 pb-2" />
        <td colSpan={columns.length + 1} className="border-b border-border px-2.5 pb-2 text-xs text-muted">
          Chọn người giới thiệu trước: Leader tự theo người đó, bạn đổi được. Enter để lưu, Esc để hủy.
          {sameName && <span className="mt-1 block text-warning">Đã có {sameName.name} ({idLabel(sameName.igniteId)}). Vẫn thêm được nếu là hai người khác nhau.</span>}
          {error && (
            <span role="alert" className="mt-1 block text-sm text-danger">
              {error}
            </span>
          )}
        </td>
      </tr>
    </>
  );
}

