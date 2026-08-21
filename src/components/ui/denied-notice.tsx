import { AlertTriangle } from "lucide-react";

/**
 * The "bạn không có quyền truy cập nội dung đó" banner a `?denied=1` redirect
 * lands on. Two pages show it for two different reasons — /dashboard for a
 * switched-off feature, /dashboard/lo-trinh for content above the member's
 * level (see the require*Access gates in src/lib/access.ts) — so the markup
 * lives here rather than being written out twice.
 */
export function DeniedNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}
