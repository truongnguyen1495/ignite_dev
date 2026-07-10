import Link from "next/link";
import { ArrowRight, Megaphone, UserPlus, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getGuestCourseItems } from "@/lib/guest-courses";
import { ANNOUNCEMENT_CATEGORY_LABELS, ANNOUNCEMENT_CATEGORY_BADGE_COLOR } from "@/lib/announcements";
import { Badge } from "@/components/ui/badge";
import { GuestCourseList } from "./courses/course-list";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flags this
// page reads.
export const dynamic = "force-dynamic";

export default async function GuestHomePage() {
  const [latestAnnouncement, courses] = await Promise.all([
    prisma.announcement.findFirst({
      where: { visibleToGuest: true, visibleToStudents: true },
      orderBy: { publishedAt: "desc" },
    }),
    getGuestCourseItems(),
  ]);

  const featuredCourses = courses.slice(0, 3);
  const trialHref = courses[0]?.href ?? "/guest/courses";

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Chào mừng đến với <span className="text-primary">LMS IGNITE</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted sm:text-base">
          Nền tảng đào tạo theo lộ trình 5 cấp — khám phá bản tin và khóa học độc quyền ngay,
          không cần đăng nhập. Đăng ký để mở khóa toàn bộ nội dung.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <UserPlus className="h-4 w-4" />
            Đăng ký ngay
          </Link>
          <Link
            href={trialHref}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <Video className="h-4 w-4" />
            Vào học thử
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Bản tin mới nhất</h2>
          <Link
            href="/guest/announcements"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {latestAnnouncement ? (
          <Link
            href={`/guest/announcements/${latestAnnouncement.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/50"
          >
            <Megaphone className="h-4 w-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-foreground">{latestAnnouncement.title}</span>
            <Badge color={ANNOUNCEMENT_CATEGORY_BADGE_COLOR[latestAnnouncement.category]}>
              {ANNOUNCEMENT_CATEGORY_LABELS[latestAnnouncement.category]}
            </Badge>
            <span className="shrink-0 text-xs text-muted">
              {latestAnnouncement.publishedAt.toLocaleDateString("vi-VN")}
            </span>
          </Link>
        ) : (
          <p className="text-sm text-muted">Chưa có bản tin công khai nào.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Khóa học nổi bật</h2>
          <Link
            href="/guest/courses"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <GuestCourseList courses={featuredCourses} />
      </section>
    </div>
  );
}
