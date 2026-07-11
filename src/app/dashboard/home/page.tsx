import Link from "next/link";
import { ArrowRight, ArrowUpCircle, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveStudent } from "@/lib/access";
import { getGuestCourseItems } from "@/lib/guest-courses";
import { GuestCourseList } from "@/app/guest/courses/course-list";
import { GuestLibraryList, type GuestLibraryItem } from "@/app/guest/library/library-list";
import { formatDateVN } from "@/lib/date";

// Same reasoning as guest/page.tsx: reads admin-toggleable featured/visible
// flags, must not be statically prerendered.
export const dynamic = "force-dynamic";

const EBOOK_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

// "Trang chủ" for a "học sinh" (no cấp) account — kế thừa bố cục trang
// /guest (cùng 3 khối: bản tin/khóa học/ebook nổi bật, cùng component),
// chỉ bỏ nút "Đăng ký ngay" (đã có tài khoản) và thay bằng lối vào yêu cầu
// tham gia hệ thống 5 cấp.
export default async function StudentHomePage() {
  const student = await requireActiveStudent();

  const [latestAnnouncements, featuredCourses, featuredEbooks] = await Promise.all([
    prisma.announcement.findMany({
      where: { visibleToGuest: true, visibleToStudents: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    getGuestCourseItems({ onlyFeatured: true }),
    prisma.libraryItem.findMany({
      where: { visibleToGuest: true, featuredOnHome: true, previewFilePath: { not: null } },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const featuredEbookItems: GuestLibraryItem[] = featuredEbooks.map((item, index) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    description: item.description,
    type: item.type,
    coverImageUrl: item.coverImageUrl,
    guestPreviewPages: item.guestPreviewPages,
    gradient: EBOOK_GRADIENTS[index % EBOOK_GRADIENTS.length],
  }));

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Chào mừng trở lại, <span className="text-primary">{student.name}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted sm:text-base">
          Bạn đang là học sinh — khám phá bản tin và khóa học độc quyền, hoặc xin tham gia hệ
          thống đào tạo 5 cấp để mở khóa toàn bộ lộ trình.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard/level-up"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Tham gia hệ thống đào tạo 5 cấp
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Bản tin mới nhất</h2>
          <Link
            href="/dashboard/announcements"
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
          <p className="text-sm text-muted">Chưa có bản tin nào.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Khóa học nổi bật</h2>
          <Link
            href="/dashboard/courses"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <GuestCourseList courses={featuredCourses} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Ebook nổi bật</h2>
          <Link
            href="/dashboard/library"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <GuestLibraryList items={featuredEbookItems} />
      </section>
    </div>
  );
}
