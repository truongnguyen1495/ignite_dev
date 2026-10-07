"use client";

import { NETWORK_STATUS_CONFIG, type NetworkStatus } from "@/lib/network-status";

// Small pieces every Team Network surface shares, so a status looks identical
// on a node, in the detail panel, in a search result and in the history tab.

export function StatusPill({ status, className = "" }: { status: NetworkStatus; className?: string }) {
  const config = NETWORK_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${config.pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// "NGUYỄN THỊ VIỆT NGÂN" -> "NN": first and last word, so two people who share a
// family name still read differently in the avatar circle.
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function InitialsAvatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-bg font-bold text-primary"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 overflow-hidden rounded-lg border border-border">
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 text-sm transition-colors ${i > 0 ? "border-l border-border" : ""} ${
              active ? "bg-primary-bg-strong font-semibold text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// What an action that threw (rather than returning { error }) reads as. The browser
// cannot tell a dropped connection from the server failing, so the message does not
// claim to know which. It is used for reads as well as writes, so it only says the
// request did not go through.
export const ACTION_FAILED_MESSAGE = "Chưa thực hiện được: mạng hoặc máy chủ đang gặp sự cố. Hãy thử lại sau ít phút.";

// "RapidX ID" is the person's IGNITE ID; someone who has none yet shows
// "Chưa có ID" rather than an invented code.
export function idLabel(igniteId: string | null): string {
  return igniteId ?? "Chưa có ID";
}

// "2026-10-07" -> "07/10/2026". The history tab uses the longer form below.
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatIsoDateLong(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d} thg ${Number(m)}, ${y}`;
}
