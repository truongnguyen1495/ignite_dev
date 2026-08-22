import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";

// Shared by /admin/revenue and /admin/finance — both are "KPI grid + delta
// chips + breakdown cards" report pages reading the same design, and a
// second hand-copied implementation would only drift from this one over
// time (see the project's own note on extracting one shared function
// whenever two pages independently derive/render the same thing).

export function formatPct(pct: number): string {
  return `${Math.abs(pct).toFixed(1).replace(".", ",")}%`;
}

/** invert=true for a metric where going UP is bad (refunds, expenses) rather than good. */
export function DeltaChip({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-muted">
        Mới
      </span>
    );
  }
  if (Math.abs(pct) < 0.05) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-muted">
        Không đổi
      </span>
    );
  }
  const isIncrease = pct > 0;
  const isGood = invert ? !isIncrease : isIncrease;
  const Icon = isIncrease ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        isGood ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatPct(pct)}
    </span>
  );
}

export type KpiIconTone = "primary" | "success" | "danger";

const ICON_TONE_CLASSES: Record<KpiIconTone, string> = {
  primary: "bg-primary-bg text-primary",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  tone = "primary",
  valueClassName = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  delta: ReactNode;
  tone?: KpiIconTone;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONE_CLASSES[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        {delta}
      </div>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold tabular-nums text-foreground ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </div>
  );
}

export function BreakdownCard({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      {children}
    </div>
  );
}
