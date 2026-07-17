import Link from "next/link";
import { BookOpen, ChevronRight, Video } from "lucide-react";
import type { GuestCourseItem } from "@/lib/guest-courses";
import { Badge } from "@/components/ui/badge";
import { PriceBlock } from "@/components/price-block";
import { BuyButton } from "@/components/buy-button";
import { GuestBuyButton } from "@/components/guest-buy-button";
import { getPricing } from "@/lib/pricing";

export type { GuestCourseItem };

function ProgressBar({ course }: { course: GuestCourseItem }) {
  if (course.totalLessons === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-dark-muted">
        <span>Tiến độ</span>
        <span>
          {course.completedCount}/{course.totalLessons} bài
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-dark-surface-raised">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${course.progressPercent}%` }}
        />
      </div>
    </div>
  );
}

// `isLoggedIn` switches the purchase footer between a real BuyButton (creates
// an order against the current session) for the học sinh home teaser and a
// GuestBuyButton (just routes to /login) for the anonymous /guest/* catalog —
// same courses/data either way, just no session to place an order against.
export function GuestCourseList({
  courses,
  isLoggedIn = false,
}: {
  courses: GuestCourseItem[];
  isLoggedIn?: boolean;
}) {
  if (courses.length === 0) {
    return <p className="text-sm text-muted">Hiện chưa có khóa học công khai nào.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const pricing = getPricing(course);
        return (
          <Link
            key={course.id}
            href={course.href}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
          >
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
              {course.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.coverImageUrl} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${course.gradient}`}
                >
                  <Video className="h-9 w-9 text-white/90" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-2">
                <Badge color={course.isFree || course.fullyUnlocked ? "success" : "warning"}>
                  {course.isFree ? "Miễn phí" : course.fullyUnlocked ? "Đã mở khóa" : "Học thử"}
                </Badge>
              </div>
              <p className="font-semibold text-dark-foreground">{course.title}</p>
              {course.description && (
                <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{course.description}</p>
              )}
              {isLoggedIn && <ProgressBar course={course} />}
              <div className="mt-auto space-y-3 pt-4">
                <div className="flex flex-nowrap items-center justify-between gap-2">
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.totalLessons} bài học
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-indigo-400">
                    {course.ctaLabel}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                {!course.fullyUnlocked && course.salesEnabled && pricing.forSale && (
                  <div className="flex items-center justify-between gap-3 border-t border-dark-border pt-3">
                    <PriceBlock price={pricing.chargeAmount} originalPrice={pricing.originalPrice} />
                    {isLoggedIn ? (
                      <BuyButton
                        kind="COURSE"
                        itemId={course.id}
                        details={{
                          title: course.title,
                          description: course.description,
                          coverImageUrl: course.coverImageUrl,
                          meta: `${course.totalLessons} bài học`,
                          price: pricing.chargeAmount,
                          originalPrice: pricing.originalPrice,
                        }}
                      />
                    ) : (
                      <GuestBuyButton />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
