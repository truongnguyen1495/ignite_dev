import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getActiveStudentOrNull, isSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// The 4 bespoke product landing pages (/product/[slug]) live entirely
// outside /dashboard's layout — their own full-bleed nav, no shared header —
// so they have no cart icon anywhere, unlike every /dashboard/* page. This
// gives them one back, same fixed bottom-right/safe-area convention as the
// support-chat widgets (dashboard/support-chat-widget.tsx) so it never
// collides with a notch/home-indicator, and same icon as the dashboard
// header's own cart link for a consistent look.
//
// Product pages are public now (guests and no-cấp students can view them —
// see the page-level comment), so this must degrade to "render nothing"
// for a signed-out visitor instead of the old requireActiveStudent(), which
// would hard-redirect anyone without a session straight to /login just for
// viewing the page.
export async function FloatingCartButton() {
  const [salesEnabled, student] = await Promise.all([isSalesEnabled(), getActiveStudentOrNull()]);
  if (!salesEnabled || !student) return null;

  const cartCount = await prisma.cartItem.count({ where: { studentId: student.id } });

  return (
    <Link
      href="/dashboard/cart"
      title="Giỏ hàng"
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
    >
      <ShoppingBag className="h-5 w-5" />
      {cartCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-on-dark-strong">
          {cartCount}
        </span>
      )}
      <span className="sr-only">Giỏ hàng</span>
    </Link>
  );
}
