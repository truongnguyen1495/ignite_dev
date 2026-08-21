import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The small shared parts of /dashboard. A private folder (`_overview`), so
 * none of this is routable — see the Next.js project-structure guide in
 * node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md.
 */

export function OverviewCard({
  children,
  muted = false,
  className = "",
}: {
  children: React.ReactNode;
  /** For the one card that holds a place for a feature that isn't built. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 ${
        muted ? "border-dashed border-border bg-surface/60" : "border-border bg-surface"
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHead({
  title,
  tag,
  action,
  meta,
}: {
  title: string;
  /** A short status word beside the title, e.g. "Giai đoạn 2". */
  tag?: React.ReactNode;
  action?: { href: string; label: string };
  /** Plain right-aligned text, used when there is no link to offer. */
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {tag}
      {action ? (
        <Link
          href={action.href}
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted transition-colors hover:text-primary-hover"
        >
          {action.label}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      ) : meta ? (
        <span className="ml-auto shrink-0 text-xs text-muted">{meta}</span>
      ) : null}
    </div>
  );
}

/**
 * Decorative on purpose, exactly like the roadmap page's bar: every bar here
 * sits beside the same figure written out ("7 / 12"), so announcing it as a
 * progressbar would only make a screen reader read the number twice.
 */
export function ProgressBar({ percent, tone = "primary" }: { percent: number; tone?: "primary" | "info" }) {
  return (
    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-faint-bg">
      <div
        className={`h-full rounded-full ${tone === "info" ? "bg-info" : "bg-primary"}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  body,
  action,
}: {
  icon: React.ReactNode;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-faint-bg text-faint">{icon}</span>
      <p className="text-sm text-muted">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-1 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Placeholder gradient for a course/library item with no cover uploaded. */
export function CoverThumb({ url, alt, tone }: { url: string | null; alt: string; tone: number }) {
  if (url) {
    // Plain <img>: these are Supabase Storage URLs on a remote host, which is
    // how every other list in this app renders a cover.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className="h-10 w-14 shrink-0 rounded-lg object-cover" />;
  }
  const gradients = [
    "from-[var(--accent)] to-[var(--primary)]",
    "from-[var(--info)] to-[var(--accent)]",
    "from-[var(--primary-hover)] to-[var(--warning)]",
  ];
  return (
    <span
      aria-hidden="true"
      className={`h-10 w-14 shrink-0 rounded-lg bg-gradient-to-br ${gradients[tone % gradients.length]}`}
    />
  );
}

/**
 * What a block shows while its own queries are still running. Each Suspense
 * boundary streams in on its own, so the page frame and the cheap cards are
 * on screen long before the expensive ones land.
 */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <OverviewCard>
      <div className="animate-pulse space-y-3 motion-reduce:animate-none">
        <div className="h-3.5 w-32 rounded bg-faint-bg" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-9 rounded-lg bg-faint-bg" />
        ))}
      </div>
    </OverviewCard>
  );
}

export function StatsSkeleton() {
  return (
    <div className="flex animate-pulse flex-wrap gap-x-7 gap-y-2 motion-reduce:animate-none">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-faint-bg" />
          <div className="h-5 w-14 rounded bg-faint-bg" />
        </div>
      ))}
    </div>
  );
}

/** English inflects, Vietnamese doesn't — same helper the roadmap page uses. */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
