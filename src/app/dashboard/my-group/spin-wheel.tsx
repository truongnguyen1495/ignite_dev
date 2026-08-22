"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { RotateCw, Smile, Trophy } from "lucide-react";
import type { SpinReward } from "@prisma/client";
import { ModalShell } from "@/components/ui/modal-shell";
import { SPIN_WHEEL_SEGMENT_COLORS } from "@/lib/spin-wheel-colors";
import rapidxMark from "../../../../public/brand/rapidx-mark.png";
import { spinWheelAction } from "./actions";

const FULL_SPINS = 6;
const FULL_SPINS_REDUCED = 1;
const SPIN_DURATION_MS = 3650;
const SPIN_DURATION_REDUCED_MS = 320;
const LED_COUNT = 20;

type ResultInfo = {
  heading: string;
  rewardText: string;
  isWin: boolean;
  icon: "trophy" | "spin" | "smile";
};

// `spinWheelAction` only reports `points` (null for non-POINTS rewards) and
// `label`, not the reward's type — so the heading/icon/confetti decision
// looks the matching SpinReward back up from the `rewards` list the wheel
// already has, rather than the server needing to widen its response shape.
// matchMedia is exactly the "external mutable value" useSyncExternalStore
// exists for — reading it inside a plain effect would mean calling setState
// synchronously on mount (a lint error: react-hooks/set-state-in-effect),
// plus a hydration-mismatch flash between the SSR default and the real value.
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

function buildResult(reward: SpinReward | undefined, points: number | null, label: string): ResultInfo {
  const rewardText = points != null ? `+${points} điểm` : label;
  if (reward?.type === "EXTRA_SPIN") {
    return { heading: "May mắn ghê!", rewardText, isWin: true, icon: "spin" };
  }
  if (reward?.type === "NONE") {
    return { heading: "Chúc may mắn lần sau!", rewardText: label, isWin: false, icon: "smile" };
  }
  return { heading: "Tuyệt vời!", rewardText, isWin: true, icon: "trophy" };
}

// Component-scoped styles, same convention as the product-landing pages
// (a plain <style> tag with a namespaced prefix, since Tailwind v4 here has
// no config file for custom keyframes). --wheel-d drives every radius as a
// calc() ratio off one responsive value instead of separate breakpoint
// jumps, so the wheel scales continuously down to small phones — 100vw minus
// ~112px approximates this card's actual content width (page padding +
// card padding) without needing a resize observer.
const SPIN_WHEEL_CSS = `
.sw-wheel-wrap {
  --wheel-d: calc(clamp(190px, calc(100vw - 112px), 320px) * 0.9);
  position: relative;
  width: var(--wheel-d);
  height: var(--wheel-d);
  margin-top: 4px;
}
.sw-led-ring {
  position: absolute;
  inset: calc(var(--wheel-d) * -0.0733);
}
.sw-led {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--wheel-d) * 0.0233);
  height: calc(var(--wheel-d) * 0.0233);
  margin: calc(var(--wheel-d) * -0.0117) 0 0 calc(var(--wheel-d) * -0.0117);
  border-radius: 50%;
  background: var(--accent);
  box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.4);
}
.sw-led.lit {
  background: var(--primary-hover);
  box-shadow: 0 0 8px 2px rgba(245, 206, 74, 0.85), 0 0 2px rgba(255, 255, 255, 0.6);
  animation: sw-twinkle 1.6s ease-in-out infinite;
}
@keyframes sw-twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.sw-pointer {
  position: absolute;
  top: calc(var(--wheel-d) * -0.0667);
  left: 50%;
  z-index: 4;
  width: calc(var(--wheel-d) * 0.0867);
  height: calc(var(--wheel-d) * 0.0867);
  margin-left: calc(var(--wheel-d) * -0.0433);
  background: linear-gradient(155deg, var(--primary-hover), var(--primary));
  transform: rotate(45deg);
  border-radius: 4px;
  box-shadow: 0 0 14px 3px rgba(245, 206, 74, 0.65), 0 4px 8px rgba(0, 0, 0, 0.4);
  animation: sw-bob 2.2s ease-in-out infinite;
}
@keyframes sw-bob {
  0%, 100% { transform: rotate(45deg) translateY(0); }
  50% { transform: rotate(45deg) translateY(3px); }
}
.sw-disc {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 5px solid var(--surface);
  box-shadow:
    0 0 0 2px var(--border-strong),
    0 18px 40px rgba(0, 0, 0, 0.45),
    inset 0 0 24px rgba(0, 0, 0, 0.25);
}
.sw-divider {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 50%;
  transform-origin: top center;
  background: linear-gradient(to bottom, rgba(6, 20, 38, 0.8), rgba(6, 20, 38, 0.18) 85%);
}
.sw-seg-label {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
}
.sw-radial-pivot {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
}
.sw-radial-pivot span {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  /* The pivot centers the label ON the ray at 0.30 * --wheel-d out from the
     hub, so half of max-width extends inward toward the hub (radius 0.11)
     and half extends outward toward the rim (radius ~0.47 inside the
     border). 0.32 keeps both halves inside that budget with a small margin
     on each side — any wider and a long label's inward half tucks under
     the hub, which is what "text overlapping the center" turned out to be. */
  max-width: calc(var(--wheel-d) * 0.32);
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  font-size: 10.5px;
  color: var(--primary-foreground);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}
.sw-hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--wheel-d) * 0.22);
  height: calc(var(--wheel-d) * 0.22);
  transform: translate(-50%, -50%);
  z-index: 3;
  border-radius: 50%;
  background: var(--surface);
  border: 3px solid var(--surface);
  box-shadow: 0 0 0 2px var(--border-strong), 0 6px 14px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
@media (prefers-reduced-motion: reduce) {
  .sw-led.lit,
  .sw-pointer {
    animation: none;
  }
}
`;

export function SpinWheel({ rewards, spinsRemaining: initialSpinsRemaining }: { rewards: SpinReward[]; spinsRemaining: number }) {
  const [rotation, setRotation] = useState(0);
  const [spinsRemaining, setSpinsRemaining] = useState(initialSpinsRemaining);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);

  const spinBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiFrameRef = useRef<number | null>(null);
  const headingId = useId();

  // Focus enters the dialog's close button when a result appears and returns
  // to the spin button once it closes, so keyboard/screen-reader users land
  // somewhere sensible on both ends instead of staying on a now-hidden button.
  useEffect(() => {
    if (result) closeBtnRef.current?.focus();
  }, [result]);

  useEffect(() => {
    if (!result?.isWin) return;
    const canvas = confettiCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const width = canvas.parentElement?.clientWidth ?? canvas.clientWidth;
    const height = canvas.parentElement?.clientHeight ?? canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: reducedMotion ? 16 : 46 }, (_, i) => ({
      x: width / 2,
      y: 32,
      vx: (Math.random() - 0.5) * 5.5,
      vy: Math.random() * -4 - 2,
      size: Math.random() * 5 + 3,
      color: SPIN_WHEEL_SEGMENT_COLORS[i % SPIN_WHEEL_SEGMENT_COLORS.length],
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
    }));

    if (reducedMotion) {
      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, 28, p.size, p.size * 0.6);
      });
      return;
    }

    const gravity = 0.16;
    let frame = 0;
    function tick() {
      ctx!.clearRect(0, 0, width, height);
      frame += 1;
      for (const p of particles) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rot * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx!.restore();
      }
      if (frame < 90) {
        confettiFrameRef.current = requestAnimationFrame(tick);
      }
    }
    confettiFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (confettiFrameRef.current != null) cancelAnimationFrame(confettiFrameRef.current);
    };
  }, [result, reducedMotion]);

  const segAngle = rewards.length > 0 ? 360 / rewards.length : 0;
  const gradient = rewards
    .map((r, i) => `${SPIN_WHEEL_SEGMENT_COLORS[i % SPIN_WHEEL_SEGMENT_COLORS.length]} ${i * segAngle}deg ${(i + 1) * segAngle}deg`)
    .join(", ");

  async function handleSpin() {
    if (spinning || spinsRemaining <= 0 || rewards.length === 0) return;
    setSpinning(true);
    setError(null);

    const response = await spinWheelAction();
    if ("error" in response) {
      setError(response.error);
      setSpinning(false);
      return;
    }

    const idx = Math.max(
      0,
      rewards.findIndex((r) => r.label === response.label)
    );
    const targetCenter = idx * segAngle + segAngle / 2;
    const extraSpins = reducedMotion ? FULL_SPINS_REDUCED : FULL_SPINS;
    const normalizedCurrent = rotation % 360;
    const delta = (360 - targetCenter - normalizedCurrent + 360) % 360;
    setRotation(rotation + delta + extraSpins * 360);

    const duration = reducedMotion ? SPIN_DURATION_REDUCED_MS : SPIN_DURATION_MS;
    window.setTimeout(() => {
      setSpinsRemaining(response.spinsRemaining);
      setSpinning(false);
      setResult(buildResult(rewards[idx], response.points, response.label));
    }, duration);
  }

  function closeResult() {
    setResult(null);
    spinBtnRef.current?.focus();
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 text-center">
      <style>{SPIN_WHEEL_CSS}</style>
      <h3 className="text-sm font-semibold text-foreground">Vòng quay may mắn</h3>
      <p className="text-xs text-muted">Nhận thêm lượt quay khi check-in và hoàn thành việc hàng ngày</p>

      {rewards.length === 0 ? (
        <p className="py-8 text-sm text-muted">Admin chưa cấu hình phần thưởng — vòng quay sẽ mở khi có.</p>
      ) : (
        <>
          <div className="sw-wheel-wrap">
            <div className="sw-led-ring" aria-hidden="true">
              {Array.from({ length: LED_COUNT }, (_, i) => {
                const angle = (360 / LED_COUNT) * i;
                const lit = i % 2 === 0;
                return (
                  <span
                    key={i}
                    className={lit ? "sw-led lit" : "sw-led"}
                    style={{
                      transform: `rotate(${angle}deg) translateY(calc(var(--wheel-d) * -0.573))`,
                      animationDelay: lit ? `${i * 0.08}s` : undefined,
                    }}
                  />
                );
              })}
            </div>

            <div className="sw-pointer" aria-hidden="true" />

            <div
              className="sw-disc"
              style={{
                background: `conic-gradient(${gradient})`,
                transform: `rotate(${rotation}deg)`,
                transition: !spinning
                  ? "none"
                  : reducedMotion
                    ? `transform ${SPIN_DURATION_REDUCED_MS}ms ease-out`
                    : `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17,0.67,0.16,1)`,
              }}
            >
              {rewards.map((r, i) => (
                <div key={`divider-${r.id}`} className="sw-divider" style={{ transform: `translateX(-50%) rotate(${i * segAngle}deg)` }} />
              ))}
              {rewards.map((r, i) => {
                const center = i * segAngle + segAngle / 2;
                // A single fixed -90deg pivot rotation reads center-to-rim
                // perfectly at 3 o'clock but drifts toward fully upside-down
                // by 9 o'clock (on-screen rotation is center - 90, so it
                // sweeps the whole circle as center does). Flipping the
                // pivot to +90deg for the left half cancels that: text
                // there reads rim-to-center instead, but stays upright —
                // the same trick radial axis labels use, trading a
                // direction switch at the 12/6 o'clock seams for never
                // rendering a label upside-down.
                const pivotRotation = center > 180 ? 90 : -90;
                return (
                  <div key={r.id} className="sw-seg-label" style={{ transform: `rotate(${center}deg)` }}>
                    <div
                      className="sw-radial-pivot"
                      style={{ transform: `translateY(calc(var(--wheel-d) * -0.30)) rotate(${pivotRotation}deg)` }}
                    >
                      <span>{r.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sw-hub">
              <Image src={rapidxMark} alt="" fill sizes="64px" className="object-cover" />
            </div>
          </div>

          <button
            ref={spinBtnRef}
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
        </>
      )}

      {result && (
        <ModalShell onClose={closeResult} labelledBy={headingId}>
          <div className="relative -m-6 overflow-hidden rounded-xl p-6">
            <canvas ref={confettiCanvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
            <div className="relative flex flex-col items-center gap-2 text-center">
              <span
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${result.isWin ? "" : "bg-surface-hover"}`}
                style={
                  result.isWin
                    ? { background: "radial-gradient(circle at 35% 30%, var(--primary-hover), var(--primary) 60%, var(--accent) 100%)" }
                    : undefined
                }
              >
                {result.icon === "trophy" && <Trophy className="h-6 w-6 text-primary-foreground" />}
                {result.icon === "spin" && <RotateCw className="h-6 w-6 text-primary-foreground" />}
                {result.icon === "smile" && <Smile className="h-6 w-6 text-muted" />}
              </span>
              <h3 id={headingId} className="text-lg font-extrabold text-foreground">
                {result.heading}
              </h3>
              <p className="text-base font-bold text-primary-hover">{result.rewardText}</p>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeResult}
                className="mt-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                Đóng
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
