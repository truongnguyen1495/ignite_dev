"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileText } from "lucide-react";
import type { LibraryItemType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { DeleteLibraryItemInlineButton } from "./delete-library-item-inline-button";

export type LibraryListItem = {
  id: string;
  title: string;
  author: string | null;
  type: LibraryItemType;
  pageCount: number | null;
  visibleToGuest: boolean;
};

const TYPE_LABELS: Record<LibraryItemType, string> = {
  BOOK: "Sách",
  DOCUMENT: "Tài liệu",
};

const TYPE_ICONS: Record<LibraryItemType, typeof BookOpen> = {
  BOOK: BookOpen,
  DOCUMENT: FileText,
};

export function LibraryList({ items }: { items: LibraryListItem[] }) {
  const [typeFilter, setTypeFilter] = useState<LibraryItemType | "ALL">("ALL");

  const filtered = items.filter((item) => typeFilter === "ALL" || item.type === typeFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border">
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

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Chưa có mục nào.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary/50"
              >
                <Link
                  href={`/admin/library/${item.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="text-foreground">{item.title}</span>
                  {item.author && <span className="text-sm text-muted">— {item.author}</span>}
                  <Badge color={item.type === "BOOK" ? "primary" : "info"}>{TYPE_LABELS[item.type]}</Badge>
                  {item.visibleToGuest && <Badge color="info">Công khai</Badge>}
                  {item.pageCount && <span className="text-xs text-muted">{item.pageCount} trang</span>}
                </Link>
                <DeleteLibraryItemInlineButton libraryItemId={item.id} libraryItemTitle={item.title} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
