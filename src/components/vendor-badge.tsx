"use client";

import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

// Shown on any Product/Course/LibraryItem card that has a sellerId — the one
// place a buyer learns "this isn't RapidX's own catalog" before clicking in.
// A plain <button> (not a nested <Link>/<a>) because every card this renders
// inside is itself one big <Link> to the item's detail page — an anchor
// inside an anchor is invalid HTML and hydrates inconsistently. stopPropagation
// keeps a click here from also triggering the card's own navigation.
export function VendorBadge({ shopName, slug }: { shopName: string; slug: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/shop/${slug}`);
      }}
      className="inline-flex w-fit items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-muted hover:text-primary"
    >
      <Store className="h-3 w-3 shrink-0" />
      Bán bởi {shopName}
    </button>
  );
}
