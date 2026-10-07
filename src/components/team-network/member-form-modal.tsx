"use client";

import { useId, useMemo, useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import {
  NETWORK_STATUS_CONFIG,
  NETWORK_STATUS_ORDER,
  type NetworkStatus,
} from "@/lib/network-status";
import {
  branchLabel,
  buildTree,
  computeBranchHeads,
  descendantIds,
  foldName,
  isValidIgniteId,
  type NetworkMemberLite,
} from "@/lib/network-tree";
import { MemberPicker } from "./member-picker";
import { StatusPill, idLabel } from "./network-ui";

export type MemberFormValues = {
  name: string;
  igniteId: string | null;
  team: string | null;
  leaderId: string | null;
  referrerId: string | null;
  status: NetworkStatus;
};

// Add and edit share one form: same fields, same checks. The differences are
// small and deliberate — a new member picks a starting status, while an
// existing one changes status through its own dialog so the history is never
// bypassed; and the network root has no leader to choose.
export function MemberFormModal({
  mode,
  member,
  members,
  teams,
  initialLeaderId = null,
  becomesRoot = false,
  onSubmit,
  onChangeStatus,
  onClose,
}: {
  mode: "add" | "edit";
  member?: NetworkMemberLite;
  members: readonly NetworkMemberLite[];
  teams: readonly string[];
  /** Add only: the person selected on the canvas, offered as the leader. */
  initialLeaderId?: string | null;
  /** Add only: the network has no root yet, so this person becomes it. */
  becomesRoot?: boolean;
  /** Resolves to an error message, or nothing when the save was accepted. */
  onSubmit: (values: MemberFormValues) => Promise<string | undefined>;
  onChangeStatus?: () => void;
  onClose: () => void;
}) {
  const uid = useId();
  const isRoot = (member?.isRoot ?? false) || becomesRoot;

  const [name, setName] = useState(member?.name ?? "");
  const [igniteId, setIgniteId] = useState(member?.igniteId ?? "");
  const [team, setTeam] = useState(member?.team ?? "");
  const [referrerId, setReferrerId] = useState<string | null>(member?.referrerId ?? null);
  const [leaderId, setLeaderId] = useState<string | null>(member ? member.leaderId : initialLeaderId);
  const [status, setStatus] = useState<NetworkStatus>(becomesRoot ? "LEAD" : "CUSTOMER");
  // Until the admin picks a leader themself, a new member follows their
  // referrer — the usual case, and one less thing to fill in.
  const [leaderTouched, setLeaderTouched] = useState(mode === "edit" || initialLeaderId !== null);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const others = useMemo(() => (member ? members.filter((m) => m.id !== member.id) : members), [members, member]);

  // Nobody may be offered who would close a loop: the member and everyone
  // below them in that tree.
  const leaderExcluded = useMemo(() => {
    if (!member) return new Set<string>();
    return new Set([member.id, ...descendantIds(buildTree(members, "leader").kids, member.id)]);
  }, [members, member]);
  const referrerExcluded = useMemo(() => {
    if (!member) return new Set<string>();
    return new Set([member.id, ...descendantIds(buildTree(members, "referrer").kids, member.id)]);
  }, [members, member]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Relations in the source spreadsheet are written as names, so two people with
  // one name make a later import ambiguous. Not blocked (they can be two real
  // people), but said out loud before it happens.
  const sameName = useMemo(() => {
    const folded = foldName(name);
    return folded ? (others.find((m) => foldName(m.name) === folded) ?? null) : null;
  }, [name, others]);

  // What saving a leader change will do, shown before it happens: the branch
  // is derived from the leader chain, so moving someone can move their whole
  // branch label too.
  const move = useMemo(() => {
    if (mode !== "edit" || !member || leaderId === member.leaderId) return null;
    const before = branchLabel(member, computeBranchHeads(members), byId);
    const next = members.map((m) => (m.id === member.id ? { ...m, leaderId } : m));
    const nextById = new Map(next.map((m) => [m.id, m]));
    const after = branchLabel(nextById.get(member.id)!, computeBranchHeads(next), nextById);
    const downline = buildTree(members, "leader").descendants.get(member.id) ?? 0;
    return { before, after, downline };
  }, [mode, member, leaderId, members, byId]);

  // The branch is derived from the leader chain, so it follows the leader picked
  // above; shown read-only so nobody looks for a field to type it into.
  const branchNow = useMemo(() => {
    if (mode !== "edit" || !member) return null;
    const next = members.map((m) => (m.id === member.id ? { ...m, leaderId: isRoot ? null : leaderId } : m));
    const nextById = new Map(next.map((m) => [m.id, m]));
    return branchLabel(nextById.get(member.id)!, computeBranchHeads(next), nextById);
  }, [mode, member, members, leaderId, isRoot]);

  function changeReferrer(next: string | null) {
    setReferrerId(next);
    if (mode === "add" && !leaderTouched) setLeaderId(next);
  }

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) return setError("Hãy nhập họ tên.");
    const code = igniteId.trim().toUpperCase();
    if (code) {
      if (!isValidIgniteId(code)) return setError("RapidX ID phải có dạng DIA + 7 chữ số, ví dụ DIA1234567.");
      const owner = others.find((m) => m.igniteId === code);
      if (owner) return setError(`RapidX ID ${code} đã thuộc về ${owner.name}.`);
    }
    setError(undefined);
    setPending(true);
    const message = await onSubmit({
      name: trimmedName,
      igniteId: code || null,
      team: team.trim() || null,
      leaderId: isRoot ? null : leaderId,
      referrerId,
      status,
    });
    setPending(false);
    if (message) setError(message);
  }

  const title = mode === "add" ? "Thêm thành viên" : "Sửa thành viên";

  return (
    <ModalShell onClose={onClose} labelledBy={`${uid}-title`} scrollable>
      <h2 id={`${uid}-title`} className="text-base font-semibold text-foreground">
        {title}
      </h2>
      {mode === "edit" && member && (
        <p className="mt-1 text-sm text-muted">
          {member.name} · {idLabel(member.igniteId)}
        </p>
      )}

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          id={`${uid}-name`}
          label="Họ tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: NGUYỄN VĂN A"
          autoComplete="off"
          autoFocus
          hint={
            sameName
              ? `Đã có ${sameName.name} (${idLabel(sameName.igniteId)}). Vẫn thêm được nếu là hai người khác nhau.`
              : isRoot && mode === "edit"
                ? "Đây là gốc mạng lưới (Lead cao nhất). Bạn đổi tên được."
                : undefined
          }
        />
        <Input
          id={`${uid}-id`}
          label="RapidX ID (không bắt buộc)"
          value={igniteId}
          onChange={(e) => setIgniteId(e.target.value)}
          placeholder="DIA1234567"
          autoComplete="off"
          className="font-mono"
          hint="Để trống nếu chưa có. Dạng DIA + 7 chữ số, không được trùng."
        />
        <div>
          <Input
            id={`${uid}-team`}
            label="Team (không bắt buộc)"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            list={`${uid}-teams`}
            placeholder="Ví dụ: G7-N1-An"
            autoComplete="off"
          />
          <datalist id={`${uid}-teams`}>
            {teams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <MemberPicker
          id={`${uid}-referrer`}
          label="Người giới thiệu"
          members={members}
          value={referrerId}
          onChange={changeReferrer}
          noneLabel="Không có người giới thiệu"
          excluded={referrerExcluded}
          hint={
            mode === "add"
              ? "Chọn người giới thiệu trước: Leader sẽ tự lấy theo người này."
              : "Độc lập với Leader. Chỉ đổi cây Giới thiệu, cây Tổ chức giữ nguyên."
          }
        />
        {isRoot ? (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">Leader</span>
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">
              {becomesRoot
                ? "Mạng lưới chưa có gốc nên người đầu tiên bạn thêm sẽ là gốc (Lead cao nhất), đứng trên cùng."
                : "Không có. Gốc mạng lưới đứng trên cùng."}
            </p>
          </div>
        ) : (
          <MemberPicker
            id={`${uid}-leader`}
            label="Leader"
            members={members}
            value={leaderId}
            onChange={(next) => {
              setLeaderTouched(true);
              setLeaderId(next);
            }}
            noneLabel="Chưa có Leader (UNASSIGNED)"
            excluded={leaderExcluded}
            hint={
              mode === "add"
                ? "Mặc định lấy theo người giới thiệu, bạn đổi được. Để trống thì vào UNASSIGNED."
                : "Đổi Leader chuyển thành viên (và cả đội bên dưới) sang vị trí mới trên cây Tổ chức."
            }
          />
        )}

        {branchNow && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">Nhánh</span>
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">
              <span className="font-semibold text-foreground">{branchNow}</span> · tự tính theo Leader, không nhập tay.
            </p>
          </div>
        )}

        {mode === "add" ? (
          <Select
            id={`${uid}-status`}
            label="Trạng thái ban đầu"
            value={status}
            onChange={(e) => setStatus(e.target.value as NetworkStatus)}
            hint="Thành viên không cần có tài khoản đăng nhập."
          >
            {NETWORK_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {NETWORK_STATUS_CONFIG[s].label}
              </option>
            ))}
          </Select>
        ) : (
          member && (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">Trạng thái</span>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2">
                <StatusPill status={member.status} />
                {onChangeStatus && (
                  <button type="button" onClick={onChangeStatus} className="text-sm font-medium text-primary hover:text-primary-hover">
                    Đổi trạng thái…
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">Đổi qua màn riêng để luôn ghi lại lịch sử.</p>
            </div>
          )
        )}

        {move && (
          <div className="rounded-lg border border-primary-border bg-primary-bg px-3 py-2 text-xs text-foreground">
            <b>Cây Tổ chức:</b> {member && member.leaderId ? (byId.get(member.leaderId)?.name ?? "—") : "UNASSIGNED"} →{" "}
            {leaderId ? (byId.get(leaderId)?.name ?? "—") : "UNASSIGNED"}
            {move.before !== move.after && (
              <>
                {" "}
                · nhánh {move.before} → {move.after}
              </>
            )}
            {move.downline > 0 && <> · kéo theo {move.downline} thành viên bên dưới</>}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" isLoading={pending}>
            {mode === "add" ? "Thêm thành viên" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
