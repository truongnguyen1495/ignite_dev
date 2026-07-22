"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Lock, ArrowRight } from "lucide-react";
import type { LibraryItemType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { BuyButton } from "@/components/buy-button";
import { PriceBlock } from "@/components/price-block";
import { getPricing } from "@/lib/pricing";
import type { LibraryAccessLevel } from "@/lib/access";

const STORAGE_KEY = "student-library-view";

export type StudentLibraryItem = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  type: LibraryItemType;
  coverImageUrl: string | null;
  accessLevel: LibraryAccessLevel;
  isFree: boolean;
  pageCount: number | null;
  href: string;
  gradient: string;
  price: number;
  salePrice: number | null;
  salesEnabled: boolean;
};

function AccessBadge({ accessLevel, isFree }: { accessLevel: LibraryAccessLevel; isFree: boolean }) {
  if (accessLevel === "full") return <Badge color="success">{isFree ? "Miễn phí" : "Đã mở khóa"}</Badge>;
  if (accessLevel === "trial") return <Badge color="warning">Học thử</Badge>;
  return <Badge color="faint">Chưa mở khóa</Badge>;
}

const TYPE_ICON: Record<LibraryItemType, typeof BookOpen> = {
  BOOK: BookOpen,
  DOCUMENT: FileText,
};

function itemMeta(item: StudentLibraryItem): string | undefined {
  const parts = [item.author, item.pageCount ? `${item.pageCount} trang` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

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
      <Icon className="h-9 w-9 text-on-dark-strong" />
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
            const clickable = item.accessLevel !== "none";
            const pricing = getPricing(item);
            const purchasable = item.accessLevel !== "full" && item.salesEnabled && pricing.forSale;
            const card = (
              <div
                className={`flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors ${
                  clickable || purchasable ? "hover:border-primary/60" : "opacity-60"
                }`}
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
                  <Thumbnail item={item} className="h-full w-full" />
                  {!clickable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-overlay">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <AccessBadge accessLevel={item.accessLevel} isFree={item.isFree} />
                  <p className="mt-3 font-semibold text-dark-foreground">{item.title}</p>
                  {item.author && <p className="mt-0.5 text-sm text-dark-muted">{item.author}</p>}
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{item.description}</p>
                  )}
                  <div className="mt-auto space-y-3 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                        {item.pageCount ? `${item.pageCount} trang` : "—"}
                      </span>
                      {clickable && (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-indigo-400">
                          {item.accessLevel === "trial" ? "Đọc thử" : "Đọc"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    {purchasable && (
                      <div className="flex items-center justify-between gap-3 border-t border-dark-border pt-3">
                        <PriceBlock price={pricing.chargeAmount} originalPrice={pricing.originalPrice} />
                        <BuyButton
                          kind="LIBRARY_ITEM"
                          itemId={item.id}
                          details={{
                            title: item.title,
                            description: item.description,
                            coverImageUrl: item.coverImageUrl,
                            meta: itemMeta(item),
                            price: pricing.chargeAmount,
                            originalPrice: pricing.originalPrice,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
            return clickable ? (
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
            const clickable = item.accessLevel !== "none";
            const pricing = getPricing(item);
            const purchasable = item.accessLevel !== "full" && item.salesEnabled && pricing.forSale;
            const row = (
              <div
                className={`flex items-center gap-4 rounded-xl border border-dark-border bg-dark-surface p-3 transition-colors ${
                  clickable || purchasable ? "hover:border-primary/60" : "opacity-60"
                }`}
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-dark-surface-raised">
                  <Thumbnail item={item} className="h-full w-full" />
                  {!clickable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-overlay">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AccessBadge accessLevel={item.accessLevel} isFree={item.isFree} />
                    <p className="truncate font-semibold text-dark-foreground">{item.title}</p>
                  </div>
                  {item.author && <p className="line-clamp-1 text-sm text-dark-muted">{item.author}</p>}
                </div>
                <div className="hidden shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300 md:flex">
                  {item.pageCount ? `${item.pageCount} trang` : "—"}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {purchasable && (
                    <>
                      <PriceBlock price={pricing.chargeAmount} originalPrice={pricing.originalPrice} />
                      <BuyButton
                        kind="LIBRARY_ITEM"
                        itemId={item.id}
                        details={{
                          title: item.title,
                          description: item.description,
                          coverImageUrl: item.coverImageUrl,
                          meta: itemMeta(item),
                          price: pricing.chargeAmount,
                          originalPrice: pricing.originalPrice,
                        }}
                      />
                    </>
                  )}
                  {clickable && <ArrowRight className="hidden h-4 w-4 shrink-0 text-accent sm:block" />}
                </div>
              </div>
            );
            return clickable ? (
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
