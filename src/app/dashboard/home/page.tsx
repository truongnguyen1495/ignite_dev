import Link from "next/link";
import { ArrowRight, ArrowUpCircle, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveStudent } from "@/lib/access";
import { getGuestCourseItems } from "@/lib/guest-courses";
import { getGuestLibraryItems } from "@/lib/guest-library";
import { GuestCourseList } from "@/app/guest/courses/course-list";
import { GuestLibraryList } from "@/app/guest/library/library-list";
import { formatDateVN } from "@/lib/date";
import { getDictionary } from "@/lib/i18n/get-locale";

// Same reasoning as guest/page.tsx: reads admin-toggleable featured/visible
// flags, must not be statically prerendered.
export const dynamic = "force-dynamic";

// "Trang chủ" for a "học sinh" (no cấp) account — kế thừa bố cục trang
// /guest (cùng 3 khối: bản tin/khóa học/ebook nổi bật, cùng component),
// chỉ bỏ nút "Đăng ký ngay" (đã có tài khoản) và thay bằng lối vào yêu cầu
// tham gia hệ thống 5 cấp. Unlike the guest version, this passes `student`
// into getGuestCourseItems/getGuestLibraryItems so "nổi bật" reflects this
// học sinh's real access (a grant, a level rule, or isFree) instead of
// always showing the guest-style trial teaser — hrefs point into their own
// /dashboard/courses and /dashboard/library routes accordingly.
export default async function StudentHomePage() {
  const student = await requireActiveStudent();
  const { t } = await getDictionary();

  const [latestAnnouncements, featuredCourses, featuredEbookItems] = await Promise.all([
    prisma.announcement.findMany({
      where: { visibleToGuest: true, visibleToStudents: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    getGuestCourseItems({ onlyFeatured: true, student }),
    getGuestLibraryItems({ onlyFeatured: true, student }),
  ]);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          {t.dashboardHomePage.welcomeBack} <span className="text-primary">{student.name}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted sm:text-base">
          {t.dashboardHomePage.hocSinhIntro}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard/level-up"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {t.dashboardHomePage.joinFiveLevel}
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t.dashboardHomePage.latestAnnouncements}</h2>
          <Link
            href="/dashboard/announcements"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t.dashboardHomePage.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {latestAnnouncements.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestAnnouncements.map((announcement) => (
              <Link
                key={announcement.id}
                href={`/dashboard/announcements/${announcement.id}`}
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
                    {formatDateVN(announcement.publishedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t.dashboardHomePage.noAnnouncements}</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t.dashboardHomePage.featuredCourses}</h2>
          <Link
            href="/dashboard/courses"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t.dashboardHomePage.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <GuestCourseList courses={featuredCourses} isLoggedIn />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t.dashboardHomePage.featuredEbooks}</h2>
          <Link
            href="/dashboard/library"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t.dashboardHomePage.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <GuestLibraryList items={featuredEbookItems} isLoggedIn />
      </section>
    </div>
  );
}
