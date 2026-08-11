"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GroupRole, Level } from "@prisma/client";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LevelBadge } from "@/components/ui/level-badge";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { GROUP_ROLE_LABELS } from "@/lib/groups";
import { addMemberAction, changeMemberRoleAction, removeMemberAction, transferMemberAction } from "../actions";

export type MemberRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: GroupRole;
  grantedLevel: Level;
  checkedInToday: boolean;
};

const ROLE_OPTIONS: GroupRole[] = ["LEADER", "DEPUTY", "MEMBER"];

export function MembersPanel({
  groupId,
  members,
  otherGroups,
  unassignedStudents,
}: {
  groupId: string;
  members: MemberRow[];
  otherGroups: { id: string; name: string }[];
  unassignedStudents: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState("");
  const [error, setError] = useState<string | undefined>();
  const confirm = useConfirm();

  function changeRole(membershipId: string, role: GroupRole) {
    setError(undefined);
    startTransition(async () => {
      const err = await changeMemberRoleAction(membershipId, groupId, role);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    });
  }

  function transfer(membershipId: string, toGroupId: string) {
    if (!toGroupId) return;
    setError(undefined);
    startTransition(async () => {
      const err = await transferMemberAction(membershipId, groupId, toGroupId);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    });
  }

  async function remove(membershipId: string, name: string) {
    const ok = await confirm({
      title: `Xóa "${name}" khỏi nhóm?`,
      description: "Người này sẽ không còn thuộc nhóm nào — có thể thêm lại vào nhóm khác bất cứ lúc nào.",
      confirmLabel: "Xóa khỏi nhóm",
      tone: "danger",
    });
    if (!ok) return;
    setError(undefined);
    startTransition(async () => {
      const err = await removeMemberAction(membershipId, groupId);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    });
  }

  function addMember() {
    if (!selectedNewMember) return;
    setError(undefined);
    startTransition(async () => {
      const err = await addMemberAction(groupId, selectedNewMember);
      if (err) {
        setError(err);
        return;
      }
      setSelectedNewMember("");
      setAddPickerOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-faint">
              <th className="px-2 pb-2">Thành viên</th>
              <th className="px-2 pb-2">Vai trò</th>
              <th className="px-2 pb-2">Cấp độ</th>
              <th className="px-2 pb-2">Check-in hôm nay</th>
              <th className="px-2 pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => (
              <tr key={m.membershipId}>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar src={m.avatarUrl} name={m.name} size={28} className="text-xs" />
                    <div>
                      <div className="font-semibold text-foreground">{m.name}</div>
                      <div className="text-xs text-faint">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <select
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => changeRole(m.membershipId, e.target.value as GroupRole)}
                    className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs font-semibold text-foreground"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {GROUP_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2.5">
                  <LevelBadge level={m.grantedLevel} />
                </td>
                <td className="px-2 py-2.5">
                  {m.checkedInToday ? <Badge color="success">Đã check-in</Badge> : <Badge color="faint">Chưa check-in</Badge>}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {otherGroups.length > 0 && (
                      <select
                        defaultValue=""
                        disabled={pending}
                        onChange={(e) => {
                          transfer(m.membershipId, e.target.value);
                          e.target.value = "";
                        }}
                        className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-muted"
                      >
                        <option value="" disabled>
                          Chuyển nhóm...
                        </option>
                        {otherGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(m.membershipId, m.name)}
                      className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-2">
        {!addPickerOpen ? (
          <button
            type="button"
            onClick={() => setAddPickerOpen(true)}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            + Thêm thành viên vào nhóm
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedNewMember}
              onChange={(e) => setSelectedNewMember(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="">Chọn thành viên chưa có nhóm...</option>
              {unassignedStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !selectedNewMember}
              onClick={addMember}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              Thêm
            </button>
            <button
              type="button"
              onClick={() => {
                setAddPickerOpen(false);
                setError(undefined);
              }}
              className="rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-muted"
            >
              Hủy
            </button>
          </div>
        )}
        {unassignedStudents.length === 0 && addPickerOpen && (
          <p className="mt-2 text-xs text-muted">Không còn thành viên nào chưa có nhóm.</p>
        )}
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
