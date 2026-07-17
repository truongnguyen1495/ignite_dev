"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

// Same shape as BuyButton (nested inside a clickable card's outer <Link>, so
// preventDefault/stopPropagation keeps a click here from also triggering the
// card's own navigation) — but for an anonymous guest there's no session to
// place an order against, so this just sends them to log in first instead of
// calling createOrderAction.
export function GuestBuyButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push("/login");
      }}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      <ShoppingCart className="h-3.5 w-3.5" />
      Mua ngay
    </button>
  );
}
