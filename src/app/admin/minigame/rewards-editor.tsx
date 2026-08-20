"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SpinRewardType } from "@prisma/client";
import { saveSpinRewardsAction, type SpinRewardInput } from "./actions";

const TYPE_LABELS: Record<SpinRewardType, string> = {
  POINTS: "Điểm cộng",
  EXTRA_SPIN: "Lượt quay thêm",
  NONE: "Không trúng gì",
};
const TYPE_OPTIONS = Object.keys(TYPE_LABELS) as SpinRewardType[];
// Mirrors spin-wheel.tsx's SEGMENT_COLORS — this is the picker that feeds it.
const SWATCH_COLORS = ["#e3b52d", "#b98218", "#17a9e8", "#22c55e"];

export function RewardsEditor({ initialRewards }: { initialRewards: SpinRewardInput[] }) {
  const router = useRouter();
  const [rewards, setRewards] = useState<SpinRewardInput[]>(initialRewards);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const total = rewards.reduce((sum, r) => sum + (r.weightPercent || 0), 0);

  function update(index: number, patch: Partial<SpinRewardInput>) {
    setSaved(false);
    setRewards((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function remove(index: number) {
    setSaved(false);
    setRewards((prev) => prev.filter((_, i) => i !== index));
  }
  function add() {
    setSaved(false);
    setRewards((prev) => [...prev, { id: null, label: "Phần thưởng mới", type: "POINTS", value: 0, weightPercent: 0 }]);
  }
  function save() {
    setError(undefined);
    startTransition(async () => {
      const err = await saveSpinRewardsAction(rewards);
      if (err) {
        setError(err);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{rewards.length} ô trên vòng quay may mắn</h3>
          <p className="text-xs text-muted">Mỗi thành viên có lượt quay cơ bản mỗi ngày, thêm khi check-in và hoàn thành việc.</p>
        </div>
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover"
        >
          + Thêm phần thưởng
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase text-faint">
              <th className="px-2 pb-2">Tên hiển thị</th>
              <th className="px-2 pb-2">Loại thưởng</th>
              <th className="px-2 pb-2">Giá trị</th>
              <th className="px-2 pb-2">Tỉ lệ trúng</th>
              <th className="px-2 pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rewards.map((r, i) => (
              <tr key={r.id ?? `new-${i}`}>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: SWATCH_COLORS[i % SWATCH_COLORS.length] }}
                    />
                    <input
                      value={r.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                      className="w-full min-w-[140px] rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={r.type}
                    onChange={(e) =>
                      update(i, { type: e.target.value as SpinRewardType, value: e.target.value === "NONE" ? 0 : r.value })
                    }
                    className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-foreground"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    disabled={r.type === "NONE"}
                    value={r.value}
                    onChange={(e) => update(i, { value: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-20 rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-foreground disabled:opacity-50"
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={r.weightPercent}
                      onChange={(e) => update(i, { weightPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                      className="w-16 rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-foreground"
                    />
                    %
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <button type="button" onClick={() => remove(i)} className="text-xs font-semibold text-danger hover:underline">
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 ${
          total === 100 ? "border-success-border bg-success-bg" : "border-warning-border bg-warning-bg"
        }`}
      >
        <span className={`text-sm font-bold ${total === 100 ? "text-success" : "text-warning"}`}>
          Tổng tỉ lệ: {total}% {total === 100 ? "✓" : "— cần đúng 100%"}
        </span>
        <span className="text-xs text-muted">Vòng quay chỉ hoạt động khi tổng tỉ lệ đúng bằng 100%</span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-semibold text-success">Đã lưu.</span>}
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
