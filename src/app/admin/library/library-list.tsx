"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText } from "lucide-react";
import type { Level, LibraryItemType } from "@prisma/client";
import { LEVEL_LABELS } from "@/lib/levels";
import { Badge } from "@/components/ui/badge";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { DeleteLibraryItemInlineButton } from "./delete-library-item-inline-button";
import { ToggleLibraryItemGuestButton } from "./toggle-library-item-guest-button";
import { ToggleLibraryItemVisibilityButton } from "./toggle-library-item-visibility-button";

const STORAGE_KEY = "admin-library-view";

export type LibraryListItem = {
  id: string;
  title: string;
  author: string | null;
  type: LibraryItemType;
  coverImageUrl: string | null;
  pageCount: number | null;
  grantsCount: number;
  levelGrants: Level[];
  visibleToGuest: boolean;
  visibleToStudents: boolean;
};

const TYPE_LABELS: Record<LibraryItemType, string> = {
  BOOK: "Sách",
  DOCUMENT: "Tài liệu",
};

const TYPE_ICONS: Record<LibraryItemType, typeof BookOpen> = {
  BOOK: BookOpen,
  DOCUMENT: FileText,
};

function Thumbnail({ item, className }: { item: LibraryListItem; className: string }) {
  const Icon = TYPE_ICONS[item.type];
  if (item.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.coverImageUrl} alt={item.title} className={`${className} object-cover`} />
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-dark-surface-raised`}>
      <Icon className="h-9 w-9 text-slate-400" />
    </div>
  );
}

// Same idea as AccessBadges on the admin course cards: at a glance, who can
// reach this item — which levels are auto-granted, whether any students
// were granted individually as an exception, and whether it's public.
function AccessBadges({ item }: { item: LibraryListItem }) {
  const hasAnyGrant = item.visibleToGuest || item.levelGrants.length > 0 || item.grantsCount > 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge color={item.type === "BOOK" ? "primary" : "info"}>{TYPE_LABELS[item.type]}</Badge>
      {!item.visibleToStudents && <Badge color="warning">Đã ẩn</Badge>}
      {item.visibleToGuest && <Badge color="info">Công khai</Badge>}
      {item.levelGrants.map((level) => (
        <Badge key={level} color="primary">
          {LEVEL_LABELS[level]} trở lên
        </Badge>
      ))}
      {item.grantsCount > 0 && <Badge color="warning">{item.grantsCount} học viên ngoại lệ</Badge>}
      {!hasAnyGrant && <Badge color="muted">Chưa cấp quyền</Badge>}
    </div>
  );
}

export function LibraryList({ items }: { items: LibraryListItem[] }) {
  const [typeFilter, setTypeFilter] = useState<LibraryItemType | "ALL">("ALL");
  const [mode, setMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "grid" || saved === "list") {
      setMode(saved);
    }
  }, []);

  function handleChange(next: ViewMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const filtered = items.filter((item) => typeFilter === "ALL" || item.type === typeFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "BOOK", "DOCUMENT"] as const).map((value) => {
            const isActive = typeFilter === value;
            const count = value === "ALL" ? items.length : items.filter((i) => i.type === value).length;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {value === "ALL" ? "Tất cả" : TYPE_LABELS[value]}
                <span className="text-xs text-faint">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="pb-2">
          <ViewToggle mode={mode} onChange={handleChange} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Chưa có mục nào.</p>
      ) : mode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div key={item.id} className="relative h-full">
              <Link
                href={`/admin/library/${item.id}`}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
                  <Thumbnail item={item} className="h-full w-full" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div>
                    <p className="font-semibold text-dark-foreground">{item.title}</p>
                    {item.author && <p className="text-sm text-dark-muted">{item.author}</p>}
                  </div>
                  <AccessBadges item={item} />
                  {item.pageCount && (
                    <span className="mt-auto pt-2 text-xs text-slate-300">{item.pageCount} trang</span>
                  )}
                </div>
              </Link>
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-surface/90 p-0.5 shadow-sm">
                <ToggleLibraryItemVisibilityButton
                  libraryItemId={item.id}
                  visibleToStudents={item.visibleToStudents}
                />
                <ToggleLibraryItemGuestButton libraryItemId={item.id} visibleToGuest={item.visibleToGuest} />
                <DeleteLibraryItemInlineButton libraryItemId={item.id} libraryItemTitle={item.title} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-dark-border bg-dark-surface p-3 hover:border-primary/60"
            >
              <Link
                href={`/admin/library/${item.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="aspect-video w-16 shrink-0 overflow-hidden rounded-md bg-dark-surface-raised">
                  <Thumbnail item={item} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-dark-foreground">{item.title}</span>
                    {item.author && <span className="text-sm text-dark-muted">— {item.author}</span>}
                    {item.pageCount && <span className="text-xs text-slate-300">{item.pageCount} trang</span>}
                  </div>
                  <AccessBadges item={item} />
                </div>
              </Link>
              <ToggleLibraryItemVisibilityButton
                libraryItemId={item.id}
                visibleToStudents={item.visibleToStudents}
              />
              <ToggleLibraryItemGuestButton libraryItemId={item.id} visibleToGuest={item.visibleToGuest} />
              <DeleteLibraryItemInlineButton libraryItemId={item.id} libraryItemTitle={item.title} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
