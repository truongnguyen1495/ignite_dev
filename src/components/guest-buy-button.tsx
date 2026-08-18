"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { loginUrlForPurchase } from "@/lib/next-path";

// Same shape as BuyButton (nested inside a clickable card's outer <Link>, so
// preventDefault/stopPropagation keeps a click here from also triggering the
// card's own navigation) — but an anonymous guest has no session to place an
// order against, so this sends them to log in first.
//
// It carries WHAT they were trying to buy: the login screen names the item
// and returns them to this exact page afterwards. Sending a bare "/login"
// (which is what this did) dropped the intent entirely — someone browsing
// the public catalogue was bounced to a generic form and then landed on the
// dashboard, with nothing tying them back to the item they wanted.
export function GuestBuyButton({ title }: { title: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(loginUrlForPurchase(window.location.pathname, title));
      }}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      <ShoppingCart className="h-3.5 w-3.5" />
      Mua ngay
    </button>
  );
}
