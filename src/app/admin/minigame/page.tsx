import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, formatDateVN, getWeekStart, todayVN } from "@/lib/groups";
import { getWeeklyLeaderboard } from "@/lib/group-data";
import { RewardsEditor } from "./rewards-editor";
import { LeaderboardPanel } from "./leaderboard-panel";
import type { SpinRewardInput } from "./actions";

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default async function AdminMinigamePage() {
  await requireAdminPermission("MANAGE_MINIGAME");

  const weekStart = getWeekStart(todayVN());
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `Tuần ${isoWeekNumber(weekStart)} · ${formatDateVN(weekStart)} – ${formatDateVN(weekEnd)}`;

  const [rewards, groups, allEntries, alreadySettledAll, history] = await Promise.all([
    prisma.spinReward.findMany({ orderBy: { order: "asc" } }),
    prisma.group.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getWeeklyLeaderboard(weekStart, "ALL"),
    prisma.weeklyRewardEntry.findFirst({ where: { weekStart, scope: "ALL", groupId: null } }),
    prisma.weeklyRewardEntry.findMany({
      include: { user: true, group: true },
      orderBy: [{ weekStart: "desc" }, { rank: "asc" }],
      take: 60,
    }),
  ]);

  const historyByWeek = new Map<string, typeof history>();
  for (const entry of history) {
    const key = `${entry.weekStart.toISOString()}|${entry.scope}|${entry.groupId ?? ""}`;
    const list = historyByWeek.get(key);
    if (list) list.push(entry);
    else historyByWeek.set(key, [entry]);
  }

  const spinRewardInputs: SpinRewardInput[] = rewards.map((r) => ({
    id: r.id,
    label: r.label,
    type: r.type,
    value: r.value,
    weightPercent: r.weightPercent,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Mini-game & thưởng" description="Cấu hình vòng quay may mắn và trao thưởng bảng xếp hạng tuần." />

      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-5">
          <RewardsEditor initialRewards={spinRewardInputs} />
        </div>
        <div className="p-5">
          <LeaderboardPanel
            weekStart={toISODate(weekStart)}
            weekLabel={weekLabel}
            groups={groups}
            initialEntries={allEntries.map((e) => ({
              userId: e.user.id,
              name: e.user.name,
              groupName: e.groupName,
              role: e.role,
              points: e.points,
            }))}
            alreadySettled={!!alreadySettledAll}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Lịch sử trao thưởng</h3>
        {historyByWeek.size === 0 ? (
          <p className="text-sm text-muted">Chưa có tuần nào được trao thưởng.</p>
        ) : (
          <div className="space-y-3">
            {Array.from(historyByWeek.entries()).map(([key, entries]) => {
              const first = entries[0];
              const scopeLabel = first.scope === "ALL" ? "Toàn hệ thống" : (first.group?.name ?? "Nhóm đã xóa");
              return (
                <div key={key} className="flex flex-wrap gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div className="w-56 shrink-0">
                    <p className="text-sm font-bold text-foreground">Tuần {isoWeekNumber(first.weekStart)}</p>
                    <p className="text-xs text-faint">
                      {formatDateVN(first.weekStart)} – {formatDateVN(addDays(first.weekStart, 6))} · {scopeLabel}
                    </p>
                  </div>
                  <div className="flex-1 space-y-0.5">
                    {entries.map((entry) => (
                      <p key={entry.id} className="text-sm text-foreground">
                        <strong>#{entry.rank} {entry.user.name}</strong>{" "}
                        <span className="text-muted">— {entry.prizeText}</span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
