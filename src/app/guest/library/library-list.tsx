import Link from "next/link";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import type { LibraryItemType } from "@prisma/client";
import type { GuestLibraryItem } from "@/lib/guest-library";
import { Badge } from "@/components/ui/badge";
import { PriceBlock } from "@/components/price-block";
import { BuyButton } from "@/components/buy-button";
import { GuestBuyButton } from "@/components/guest-buy-button";
import { getPricing } from "@/lib/pricing";

export type { GuestLibraryItem };

const TYPE_ICON: Record<LibraryItemType, typeof BookOpen> = {
  BOOK: BookOpen,
  DOCUMENT: FileText,
};

// `isLoggedIn` switches the purchase footer between a real BuyButton (creates
// an order against the current session) for the học sinh home teaser and a
// GuestBuyButton (just routes to /login) for the anonymous /guest/* catalog.
export function GuestLibraryList({
  items,
  isLoggedIn = false,
}: {
  items: GuestLibraryItem[];
  isLoggedIn?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Hiện chưa có sách hay tài liệu công khai nào.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = TYPE_ICON[item.type];
        const pricing = getPricing(item);
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-colors hover:border-primary/60"
          >
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-dark-surface-raised">
              {item.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${item.gradient}`}
                >
                  <Icon className="h-9 w-9 text-white/90" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-2">
                <Badge color={item.isFree || item.fullyUnlocked ? "success" : "warning"}>
                  {item.isFree ? "Miễn phí" : item.fullyUnlocked ? "Đã mở khóa" : "Học thử"}
                </Badge>
              </div>
              <p className="font-semibold text-dark-foreground">{item.title}</p>
              {item.author && <p className="mt-0.5 text-sm text-dark-muted">{item.author}</p>}
              {item.description && (
                <p className="mt-1 line-clamp-2 text-sm text-dark-muted">{item.description}</p>
              )}
              <div className="mt-auto space-y-3 pt-4">
                <div className="flex flex-nowrap items-center justify-between gap-2">
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-300">
                    {item.fullyUnlocked
                      ? "Đọc toàn bộ"
                      : item.guestPreviewPages
                        ? `Xem thử ${item.guestPreviewPages} trang`
                        : "Xem thử"}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-indigo-400">
                    {item.fullyUnlocked ? "Đọc ngay" : "Đọc thử"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                {!item.fullyUnlocked && item.salesEnabled && pricing.forSale && (
                  <div className="flex items-center justify-between gap-3 border-t border-dark-border pt-3">
                    <PriceBlock price={pricing.chargeAmount} originalPrice={pricing.originalPrice} />
                    {isLoggedIn ? (
                      <BuyButton
                        kind="LIBRARY_ITEM"
                        itemId={item.id}
                        details={{
                          title: item.title,
                          description: item.description,
                          coverImageUrl: item.coverImageUrl,
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
