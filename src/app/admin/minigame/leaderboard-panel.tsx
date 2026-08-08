"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getScopedLeaderboardAction, settleWeeklyRewardsAction, type ScopedLeaderboardEntry } from "./actions";

const DEFAULT_PRIZES = ["200.000đ + Voucher trải nghiệm", "100.000đ", "50.000đ + Quà lưu niệm"];

export function LeaderboardPanel({
  weekStart,
  weekLabel,
  groups,
  initialEntries,
  alreadySettled,
}: {
  weekStart: string;
  weekLabel: string;
  groups: { id: string; name: string }[];
  initialEntries: ScopedLeaderboardEntry[];
  alreadySettled: boolean;
}) {
  const router = useRouter();
  const [scope, setScope] = useState<string>("ALL");
  const [entries, setEntries] = useState<ScopedLeaderboardEntry[]>(initialEntries);
  const [loading, startLoading] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [prizes, setPrizes] = useState<string[]>(DEFAULT_PRIZES);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [settled, setSettled] = useState(alreadySettled);

  function changeScope(value: string) {
    setScope(value);
    startLoading(async () => {
      const { entries: data, alreadySettled: settledForScope } = await getScopedLeaderboardAction(
        weekStart,
        value === "ALL" ? "ALL" : "GROUP",
        value === "ALL" ? null : value
      );
      setEntries(data);
      setSettled(settledForScope);
    });
  }

  const top3 = entries.slice(0, 3);
  const scopeLabel = scope === "ALL" ? "Toàn hệ thống" : groups.find((g) => g.id === scope)?.name ?? "";

  function submitSettle() {
    setError(undefined);
    startTransition(async () => {
      const err = await settleWeeklyRewardsAction(
        weekStart,
        scope === "ALL" ? "ALL" : "GROUP",
        scope === "ALL" ? null : scope,
        top3.map((e, i) => ({ rank: i + 1, userId: e.userId, prizeText: prizes[i] ?? "" }))
      );
      if (err) {
        setError(err);
        return;
      }
      setModalOpen(false);
      setSettled(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">{weekLabel}</h3>
          <select
            value={scope}
            onChange={(e) => changeScope(e.target.value)}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs font-semibold text-foreground"
          >
            <option value="ALL">Toàn hệ thống</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={settled || top3.length === 0}
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {settled ? "Đã trao thưởng tuần này" : "Chốt & trao thưởng tuần này"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-surface-hover text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Hạng</th>
              <th className="px-4 py-3 text-left">Thành viên</th>
              <th className="px-4 py-3 text-left">Nhóm</th>
              <th className="px-4 py-3 text-left">Điểm tuần này</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Đang tải...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Chưa có dữ liệu tuần này.
                </td>
              </tr>
            ) : (
              entries.map((e, i) => (
                <tr key={e.userId}>
                  <td className="px-4 py-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? "bg-accent-bg text-accent-hover"
                          : i === 1
                            ? "bg-faint-bg text-muted"
                            : i === 2
                              ? "bg-warning-bg text-warning"
                              : "bg-faint-bg text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{e.name}</td>
                  <td className="px-4 py-3 text-muted">{e.groupName}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{e.points}đ</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-5" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wide text-faint">{weekLabel}</p>
            <h3 className="mt-1 text-base font-bold text-foreground">Xác nhận trao thưởng</h3>
            <p className="mt-1 text-xs text-muted">
              Phạm vi: {scopeLabel} — top {top3.length} hiện tại
            </p>

            <div className="mt-4 space-y-2.5">
              {top3.map((e, i) => (
                <div key={e.userId} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-faint-bg text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <span className="w-28 shrink-0 truncate text-sm font-semibold text-foreground">{e.name}</span>
                  <input
                    value={prizes[i] ?? ""}
                    onChange={(ev) => setPrizes((prev) => prev.map((p, idx) => (idx === i ? ev.target.value : p)))}
                    className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {error && <p className="mt-3 text-xs text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submitSettle}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {pending ? "Đang xử lý..." : "Xác nhận trao thưởng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
