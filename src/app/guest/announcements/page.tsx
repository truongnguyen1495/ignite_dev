import Link from "next/link";
import { AlertTriangle, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ANNOUNCEMENT_CATEGORY_LABELS, ANNOUNCEMENT_CATEGORY_BADGE_COLOR } from "@/lib/announcements";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

// Reading searchParams already forces dynamic rendering, but declare this
// explicitly so it doesn't silently regress to a stale static snapshot if
// that usage ever changes — see src/app/guest/courses/page.tsx for what
// happens when a guest page has no dynamic API to trigger this.
export const dynamic = "force-dynamic";

export default async function GuestAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  const announcements = await prisma.announcement.findMany({
    // visibleToStudents doubles as a master hide switch: hidden-from-students
    // announcements never show up for guests either, regardless of visibleToGuest.
    where: { visibleToGuest: true, visibleToStudents: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bản tin này không công khai.
        </p>
      )}
      <PageHeader title="Bản tin" description="Thông báo công khai từ ban quản trị — không cần đăng nhập." />

      {announcements.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bản tin công khai nào.</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <Link
                href={`/guest/announcements/${announcement.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/50"
              >
                {announcement.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={announcement.coverImageUrl}
                    alt=""
                    className="aspect-video w-20 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex aspect-video w-20 shrink-0 items-center justify-center rounded-md bg-faint-bg">
                    <Megaphone className="h-4 w-4 text-muted" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{announcement.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <Badge color={ANNOUNCEMENT_CATEGORY_BADGE_COLOR[announcement.category]}>
                      {ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}
                    </Badge>
                    <span className="text-xs text-muted">
                      {announcement.publishedAt.toLocaleDateString("vi-VN")}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
