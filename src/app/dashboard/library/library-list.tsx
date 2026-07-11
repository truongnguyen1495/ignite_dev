"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Lock, ArrowRight } from "lucide-react";
import type { LibraryItemType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";

const STORAGE_KEY = "student-library-view";

export type StudentLibraryItem = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  type: LibraryItemType;
  coverImageUrl: string | null;
  unlocked: boolean;
  pageCount: number | null;
  href: string;
  gradient: string;
};

const TYPE_ICON: Record<LibraryItemType, typeof BookOpen> = {
  BOOK: BookOpen,
  DOCUMENT: FileText,
};

function Thumbnail({ item, className }: { item: StudentLibraryItem; className: string }) {
  const Icon = TYPE_ICON[item.type];
  if (item.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.coverImageUrl} alt={item.title} className={`${className} object-cover`} />
    );
  }
  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br ${item.gradient}`}>
      <Icon className="h-9 w-9 text-white/90" />
    </div>
  );
}

export function LibraryList({ items }: { items: StudentLibraryItem[] }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "grid" || saved === "list" ? saved : "grid";
  });

  function handleChange(next: ViewMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">Thư viện hiện chưa có sách hay tài liệu nào.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ViewToggle mode={mode} onChange={handleChange} />
      </div>

      {mode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const card = (
              <div
                className={`flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors ${
                  item.unlocked ? "hover:border-primary/60" : "opacity-60"
                }`}
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
                  <Thumbnail item={item} className="h-full w-full" />
                  {!item.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {item.unlocked ? (
                    <Badge color="success">Đã mở khóa</Badge>
                  ) : (
                    <Badge color="faint">Chưa mở khóa</Badge>
                  )}
                  <p className="mt-3 font-semibold text-dark-foreground">{item.title}</p>
                  {item.author && <p className="mt-0.5 text-sm text-dark-muted">{item.author}</p>}
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{item.description}</p>
                  )}
                  <div className="mt-auto flex flex-nowrap items-center justify-between gap-2 pt-4">
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                      {item.pageCount ? `${item.pageCount} trang` : "—"}
                    </span>
                    {item.unlocked && (
                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-indigo-400">
                        Đọc
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
            return item.unlocked ? (
              <Link key={item.id} href={item.href} className="block h-full">
                {card}
              </Link>
            ) : (
              <div key={item.id} className="h-full">
                {card}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const row = (
              <div
                className={`flex items-center gap-4 rounded-xl border border-dark-border bg-dark-surface p-3 transition-colors ${
                  item.unlocked ? "hover:border-primary/60" : "opacity-60"
                }`}
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-dark-surface-raised">
                  <Thumbnail item={item} className="h-full w-full" />
                  {!item.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.unlocked ? (
                      <Badge color="success">Đã mở khóa</Badge>
                    ) : (
                      <Badge color="faint">Chưa mở khóa</Badge>
                    )}
                    <p className="truncate font-semibold text-dark-foreground">{item.title}</p>
                  </div>
                  {item.author && <p className="line-clamp-1 text-sm text-dark-muted">{item.author}</p>}
                </div>
                <div className="hidden shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300 md:flex">
                  {item.pageCount ? `${item.pageCount} trang` : "—"}
                </div>
                {item.unlocked && (
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-accent sm:block" />
                )}
              </div>
            );
            return item.unlocked ? (
              <Link key={item.id} href={item.href}>
                {row}
              </Link>
            ) : (
              <div key={item.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
