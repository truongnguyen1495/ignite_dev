"use client";

import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StatusHistoryEntry } from "@/lib/network";
import type { TreeRelation, NetworkMemberLite } from "@/lib/network-tree";
import { InitialsAvatar, StatusPill, formatIsoDateLong, idLabel } from "./network-ui";

export type DetailTab = "overview" | "history" | "team";

export type HistoryState = { status: "loading" } | { status: "error" } | { status: "ready"; entries: StatusHistoryEntry[] };

const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "history", label: "Lịch sử trạng thái" },
  { id: "team", label: "Đội nhóm" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </>
  );
}

function PersonLink({ person, onSelect }: { person: NetworkMemberLite | undefined; onSelect: (id: string) => void }) {
  if (!person) return <span className="text-faint">—</span>;
  return (
    <button type="button" onClick={() => onSelect(person.id)} className="text-left font-semibold text-primary hover:underline">
      {person.name}
    </button>
  );
}

// Everything about one member, opened by clicking their node. Leader and
// referrer are separate rows because they are separate relationships.
export function MemberDetailPanel({
  member,
  leader,
  referrer,
  branch,
  directMembers,
  totalDownline,
  view,
  isTeamLead,
  directLeaderCount,
  history,
  tab,
  onTab,
  onSelectMember,
  onEdit,
  onChangeStatus,
  onAddBelow,
  onDelete,
  onRetryHistory,
  onClose,
}: {
  member: NetworkMemberLite;
  leader: NetworkMemberLite | undefined;
  referrer: NetworkMemberLite | undefined;
  branch: string;
  directMembers: NetworkMemberLite[];
  totalDownline: number;
  view: TreeRelation;
  isTeamLead: boolean;
  directLeaderCount: number;
  history: HistoryState;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onSelectMember: (id: string) => void;
  onEdit: () => void;
  onChangeStatus: () => void;
  onAddBelow: () => void;
  onDelete: () => void;
  onRetryHistory: () => void;
  onClose: () => void;
}) {
  const role = member.isRoot ? "Gốc mạng lưới (Lead cao nhất)" : isTeamLead ? `Trưởng đội · ${directLeaderCount} trực tiếp` : "Thành viên";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <InitialsAvatar name={member.name} size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold leading-snug text-foreground">{member.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusPill status={member.status} />
            {member.isRoot && <span className="rounded-full bg-faint-bg px-2 py-0.5 text-[11px] text-muted">Gốc mạng lưới</span>}
          </div>
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

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "overview" && (
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-3 text-sm">
            <Row label="RapidX ID">
              {member.igniteId ? <span className="font-mono">{member.igniteId}</span> : <span className="text-faint">Chưa có ID</span>}
            </Row>
            <Row label="Trạng thái">
              <StatusPill status={member.status} />
            </Row>
            <Row label="Vai trò">{role}</Row>
            <Row label="Nhánh">{branch}</Row>
            <Row label="Team">{member.team ?? <span className="text-faint">—</span>}</Row>
            <Row label="Leader">
              {member.isRoot ? <span className="text-faint">Không có (gốc)</span> : leader ? <PersonLink person={leader} onSelect={onSelectMember} /> : <span className="text-faint">Chưa có Leader</span>}
            </Row>
            <Row label="Người giới thiệu">
              {referrer ? <PersonLink person={referrer} onSelect={onSelectMember} /> : <span className="text-faint">Không có</span>}
            </Row>
          </dl>
        )}

        {tab === "history" && (
          <>
            {history.status === "loading" && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch sử…
              </p>
            )}
            {history.status === "error" && (
              <div className="space-y-2 text-sm">
                <p className="text-danger">Không tải được lịch sử trạng thái.</p>
                <Button type="button" size="sm" variant="secondary" onClick={onRetryHistory}>
                  Thử lại
                </Button>
              </div>
            )}
            {history.status === "ready" && history.entries.length === 0 && <p className="text-sm text-muted">Chưa có lịch sử.</p>}
            {history.status === "ready" && history.entries.length > 0 && (
              <ol className="relative space-y-5 border-l-2 border-border pl-5">
                {history.entries.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <p className="text-xs tabular-nums text-muted">{formatIsoDateLong(entry.effectiveDate)}</p>
                    <div className="my-1.5 flex flex-wrap items-center gap-1.5 text-faint">
                      {entry.fromStatus ? (
                        <>
                          <StatusPill status={entry.fromStatus} /> →
                        </>
                      ) : (
                        <span className="text-xs text-muted">Bắt đầu</span>
                      )}
                      <StatusPill status={entry.toStatus} />
                    </div>
                    <p className="text-sm text-muted">
                      Người đổi: <b className="font-semibold text-foreground">{entry.changedByName}</b>
                    </p>
                    {entry.reason && <p className="mt-0.5 text-sm text-foreground">Lý do: {entry.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        {tab === "team" && (
          <>
            <p className="mb-2 text-xs text-muted">Theo cây {view === "leader" ? "Tổ chức" : "Giới thiệu"}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-2xl font-bold tabular-nums text-foreground">{directMembers.length}</p>
                <p className="text-xs text-muted">Trực tiếp</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-2xl font-bold tabular-nums text-foreground">{totalDownline}</p>
                <p className="text-xs text-muted">Tổng downline</p>
              </div>
            </div>
            <p className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Thành viên trực tiếp</p>
            {directMembers.length === 0 ? (
              <p className="text-sm text-muted">Chưa có thành viên trực tiếp.</p>
            ) : (
              <ul className="space-y-0.5">
                {directMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelectMember(m.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-hover"
                    >
                      <InitialsAvatar name={m.name} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{m.name}</span>
                        <span className="block font-mono text-[11px] text-muted">{idLabel(m.igniteId)}</span>
                      </span>
                      <StatusPill status={m.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
        <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
          Sửa thành viên
        </Button>
        <Button type="button" size="sm" onClick={onChangeStatus}>
          Đổi trạng thái
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onAddBelow}>
          <Plus className="h-3.5 w-3.5" /> Thêm vào đội này
        </Button>
        {!member.isRoot && (
          <Button type="button" size="sm" variant="ghost" className="text-danger hover:bg-danger-bg hover:text-danger" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Xóa khỏi mạng lưới
          </Button>
        )}
      </div>
    </div>
  );
}
