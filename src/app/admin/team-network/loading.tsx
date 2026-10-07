// Shown while the member list loads. A blank canvas would read as "empty
// network", so say what is happening and sketch the shape of what is coming.
export default function TeamNetworkLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <div>
        <div className="h-8 w-64 animate-pulse rounded-lg bg-faint-bg" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-faint-bg" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[4.25rem] flex-1 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <div className="flex h-[min(60dvh,560px)] min-h-[360px] flex-col items-center justify-center gap-6 rounded-2xl border border-border bg-background">
        <div className="flex items-center gap-8">
          <div className="h-14 w-40 animate-pulse rounded-xl border border-border bg-surface" />
          <div className="flex flex-col gap-3">
            <div className="h-14 w-40 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="h-14 w-40 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="h-14 w-40 animate-pulse rounded-xl border border-border bg-surface" />
          </div>
        </div>
        <p className="text-sm text-muted">Đang tải Team Network…</p>
      </div>
    </div>
  );
}
