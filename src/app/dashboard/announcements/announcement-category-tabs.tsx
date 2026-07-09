"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import type { AnnouncementCategory } from "@prisma/client";

export function AnnouncementCategoryTabs({
  categories,
}: {
  categories: { category: AnnouncementCategory; unreadCount: number }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only the list route filters by category — while reading a specific
  // announcement, no tab reflects that page's category, since it isn't
  // filtered by one.
  const onListPage = pathname === "/dashboard/announcements";
  const requestedCategory = searchParams.get("category");
  const active = onListPage
    ? (categories.find((c) => c.category === requestedCategory)?.category ?? categories[0]?.category)
    : null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-border">
      {categories.map(({ category, unreadCount }) => {
        const isActive = category === active;
        return (
          <Link
            key={category}
            href={`/dashboard/announcements?category=${category}`}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {ANNOUNCEMENT_CATEGORY_LABELS[category]}
            {unreadCount > 0 && <Badge color="primary">{unreadCount}</Badge>}
          </Link>
        );
      })}
    </div>
  );
}
