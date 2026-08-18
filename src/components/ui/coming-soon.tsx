import Link from "next/link";
import { Clock } from "lucide-react";

// Every menu entry whose feature isn't built yet points at a real route that
// renders this — never at a dead/disabled row. Two reasons: a member can see
// what the product is going to offer instead of staring at greyed-out text,
// and each feature already owns its final URL, so shipping it later means
// replacing this page's body rather than moving the link and breaking anyone's
// bookmark.
export function ComingSoon({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mx-auto w-full max-w-xl py-6">
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-bg text-primary">
          <Clock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">{title} — sắp ra mắt</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          {description ??
            "Tính năng này đang được xây dựng. Bạn sẽ nhận được thông báo ngay khi nó sẵn sàng."}
        </p>
        <Link
          href={backHref}
          className="mt-6 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          ← {backLabel}
        </Link>
      </div>
    </div>
  );
}
