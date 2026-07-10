"use client";

import Link from "next/link";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import { ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import type { AnnouncementCategory } from "@prisma/client";

export type GuestAnnouncementItem = {
  id: string;
  title: string;
  publishedAt: string;
};

export function GuestAnnouncementTabs({
  categories,
}: {
  categories: { category: AnnouncementCategory; items: GuestAnnouncementItem[] }[];
}) {
  const [active, setActive] = useState<AnnouncementCategory>(categories[0].category);
  const activeItems = categories.find((c) => c.category === active)?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border">
        {categories.map(({ category, items }) => {
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
              <span className="text-xs text-faint">({items.length})</span>
            </button>
          );
        })}
      </div>

      {activeItems.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bản tin công khai nào.</p>
      ) : (
        <ul className="space-y-2">
          {activeItems.map((announcement) => (
            <li key={announcement.id}>
              <Link
                href={`/guest/announcements/${announcement.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/50"
              >
                <Megaphone className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-foreground">{announcement.title}</span>
                <span className="shrink-0 text-xs text-muted">{announcement.publishedAt}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
