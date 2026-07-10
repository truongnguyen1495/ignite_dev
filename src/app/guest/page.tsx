import Link from "next/link";
import { ArrowRight, Megaphone, UserPlus, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getGuestCourseItems } from "@/lib/guest-courses";
import { GuestCourseList } from "./courses/course-list";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flags this
// page reads.
export const dynamic = "force-dynamic";

export default async function GuestHomePage() {
  const [latestAnnouncements, courses] = await Promise.all([
    prisma.announcement.findMany({
      where: { visibleToGuest: true, visibleToStudents: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
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
        {latestAnnouncements.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestAnnouncements.map((announcement) => (
              <Link
                key={announcement.id}
                href={`/guest/announcements/${announcement.id}`}
                className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/50"
              >
                {announcement.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={announcement.coverImageUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-faint-bg">
                    <Megaphone className="h-6 w-6 text-muted" />
                  </div>
                )}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{announcement.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {announcement.publishedAt.toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
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
