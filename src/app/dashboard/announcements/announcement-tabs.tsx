"use client";

import Link from "next/link";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import type { AnnouncementCategory } from "@prisma/client";

export type AnnouncementListItem = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  publishedAt: string;
  isUnread: boolean;
};

export function AnnouncementTabs({
  categories,
}: {
  categories: { category: AnnouncementCategory; items: AnnouncementListItem[] }[];
}) {
  const [active, setActive] = useState<AnnouncementCategory>(categories[0].category);
  const activeItems = categories.find((c) => c.category === active)?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border">
        {categories.map(({ category, items }) => {
          const unreadCount = items.filter((item) => item.isUnread).length;
          const isActive = category === active;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {ANNOUNCEMENT_CATEGORY_LABELS[category]}
              {unreadCount > 0 && <Badge color="primary">{unreadCount}</Badge>}
            </button>
          );
        })}
      </div>

      {activeItems.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bản tin nào.</p>
      ) : (
        <ul className="space-y-2">
          {activeItems.map((announcement) => (
            <li key={announcement.id}>
              <Link
                href={`/dashboard/announcements/${announcement.id}`}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary-border-hover ${
                  announcement.isUnread ? "border-primary-border bg-primary-bg-subtle" : "border-border bg-surface"
                }`}
              >
                {announcement.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={announcement.coverImageUrl}
                    alt=""
                    className="aspect-video w-16 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <Megaphone
                    className={`h-4 w-4 shrink-0 ${announcement.isUnread ? "text-primary" : "text-muted"}`}
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-foreground">{announcement.title}</span>
                {announcement.isUnread && <Badge color="primary">Mới</Badge>}
                <span className="shrink-0 text-xs text-muted">{announcement.publishedAt}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
