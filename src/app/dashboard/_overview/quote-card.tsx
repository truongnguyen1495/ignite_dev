import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getQuoteForToday } from "@/lib/groups";
import { CardHead, OverviewCard } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

/**
 * The quote rotates by Vietnam calendar day from a fixed pool in
 * src/lib/groups.ts — no query, so this card renders with the page frame
 * rather than streaming in. The pool is Vietnamese-only, like the group
 * feature it belongs to; only the card's own title is translated.
 */
export function QuoteCard({ copy }: { copy: Copy }) {
  return (
    <OverviewCard>
      <CardHead title={copy.quoteTitle} />
      <blockquote className="border-l-[3px] border-primary py-1 pl-4">
        <p className="text-sm leading-relaxed text-foreground">{getQuoteForToday()}</p>
        <footer className="mt-2 text-xs text-faint">— RapidX</footer>
      </blockquote>
    </OverviewCard>
  );
}
