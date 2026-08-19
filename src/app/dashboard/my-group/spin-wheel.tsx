"use client";

import { useState } from "react";
import type { SpinReward } from "@prisma/client";
import { spinWheelAction } from "./actions";

const SEGMENT_COLORS = ["#a855f7", "#facc15", "#38bdf8", "#34d399"];

export function SpinWheel({ rewards, spinsRemaining: initialSpinsRemaining }: { rewards: SpinReward[]; spinsRemaining: number }) {
  const [rotation, setRotation] = useState(0);
  const [spinsRemaining, setSpinsRemaining] = useState(initialSpinsRemaining);
  const [spinning, setSpinning] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const segAngle = rewards.length > 0 ? 360 / rewards.length : 0;
  const gradient = rewards
    .map((r, i) => `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${i * segAngle}deg ${(i + 1) * segAngle}deg`)
    .join(", ");

  async function handleSpin() {
    if (spinning || spinsRemaining <= 0 || rewards.length === 0) return;
    setSpinning(true);
    setError(null);
    setResultText(null);

    const result = await spinWheelAction();
    if ("error" in result) {
      setError(result.error);
      setSpinning(false);
      return;
    }

    const idx = Math.max(
      0,
      rewards.findIndex((r) => r.label === result.label)
    );
    const targetCenter = idx * segAngle + segAngle / 2;
    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const extraSpins = reducedMotion ? 1 : 6;
    const normalizedCurrent = rotation % 360;
    const delta = (360 - targetCenter - normalizedCurrent + 360) % 360;
    setRotation(rotation + delta + extraSpins * 360);

    const duration = reducedMotion ? 320 : 3650;
    window.setTimeout(() => {
      setResultText(result.points ? `Bạn nhận được +${result.points} điểm!` : result.label);
      setSpinsRemaining(result.spinsRemaining);
      setSpinning(false);
    }, duration);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 text-center">
      <h3 className="text-sm font-semibold text-foreground">Vòng quay may mắn</h3>
      <p className="text-xs text-muted">Nhận thêm lượt quay khi check-in và hoàn thành việc hàng ngày</p>

      {rewards.length === 0 ? (
        <p className="py-8 text-sm text-muted">Admin chưa cấu hình phần thưởng — vòng quay sẽ mở khi có.</p>
      ) : (
        <>
          <div className="relative my-1 h-[200px] w-[200px]">
            <div className="absolute -top-1.5 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-foreground" />
            <div
              className="h-full w-full rounded-full border-4 border-surface shadow-[0_8px_20px_rgba(17,24,39,0.15)] ring-2 ring-border-strong"
              style={{
                background: `conic-gradient(${gradient})`,
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 3.65s cubic-bezier(0.17,0.67,0.16,1)" : "none",
              }}
            >
              {rewards.map((r, i) => {
                const center = i * segAngle + segAngle / 2;
                return (
                  <div key={r.id} className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${center}deg)` }}>
                    <span
                      className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-[#14061f]"
                      style={{ transform: "translateY(-84px)", textShadow: "0 1px 2px rgba(255,255,255,0.35)" }}
                    >
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-border-strong bg-surface" />
          </div>

          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning || spinsRemaining <= 0}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
          >
            {spinsRemaining <= 0 ? "Hết lượt hôm nay" : spinning ? "Đang quay..." : "Quay ngay"}
          </button>
          <p className="text-xs text-muted">
            Còn <strong className="text-foreground">{spinsRemaining}</strong> lượt quay hôm nay
          </p>
          {error && <p className="text-xs text-danger">{error}</p>}
          {resultText && (
            <p role="status" className="text-sm font-bold text-primary">
              {resultText}
            </p>
          )}
        </>
      )}
    </div>
  );
}
