"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Megaphone } from "lucide-react";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";

const STORAGE_KEY = "guest-announcements-view";

export type GuestAnnouncementItem = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  publishedAt: string;
};

export function GuestAnnouncementList({ announcements }: { announcements: GuestAnnouncementItem[] }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "grid" || saved === "list" ? saved : "list";
  });

  function handleChange(next: ViewMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (announcements.length === 0) {
    return <p className="text-sm text-muted">Chưa có bản tin công khai nào.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle mode={mode} onChange={handleChange} />
      </div>

      {mode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((a) => (
            <Link
              key={a.id}
              href={`/guest/announcements/${a.id}`}
              className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/50"
            >
              {a.coverImageUrl ? (
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image src={a.coverImageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-faint-bg">
                  <Megaphone className="h-6 w-6 text-muted" />
                </div>
              )}
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-foreground">{a.title}</p>
                <p className="mt-1 text-xs text-muted">{a.publishedAt}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id}>
              <Link
                href={`/guest/announcements/${a.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/50"
              >
                {a.coverImageUrl ? (
                  <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md">
                    <Image src={a.coverImageUrl} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                ) : (
                  <span className="flex aspect-video w-20 shrink-0 items-center justify-center rounded-md bg-faint-bg">
                    <Megaphone className="h-4 w-4 text-muted" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">{a.title}</span>
                  <span className="mt-1 block text-xs text-muted">{a.publishedAt}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
