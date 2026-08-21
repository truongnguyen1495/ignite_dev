import { Lock } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { CardHead, OverviewCard } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

/**
 * Holds the place for the business half of RapidX — leads, downline, personal
 * sales, commission. None of it can be computed yet: nothing in the schema
 * records who introduced whom, and Product.cv is a display-only figure with
 * no compensation logic behind it. Drawn now, deliberately empty, so shipping
 * the referral tree later means filling four tiles in rather than re-cutting
 * the page around them.
 *
 * Purely static — no query, so it never sits behind a <Suspense>.
 */
export function MomentumCard({ copy }: { copy: Copy }) {
  const tiles = [copy.momentumLeads, copy.momentumDownline, copy.momentumRevenue, copy.momentumCommission];

  return (
    <OverviewCard muted>
      <CardHead
        title={copy.momentumTitle}
        tag={
          <span className="rounded-md border border-border bg-faint-bg px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-faint">
            {copy.momentumPhase}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((label) => (
          <div key={label} className="rounded-xl border border-dashed border-border bg-faint-bg px-3 py-4 text-center">
            <span aria-hidden="true" className="block font-mono text-xl text-faint">
              —
            </span>
            <span className="text-[11px] leading-tight text-muted">{label}</span>
          </div>
        ))}
      </div>

      <p className="mt-3.5 flex items-start gap-2.5 text-xs leading-relaxed text-muted">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
        {copy.momentumLockedNote}
      </p>
    </OverviewCard>
  );
}
