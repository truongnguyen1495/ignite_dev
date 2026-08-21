import Link from "next/link";
import { Receipt } from "lucide-react";
import type { User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { ORDER_STATUS_BADGE_COLOR, ORDER_STATUS_LABELS } from "@/lib/orders";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getOverviewShopping } from "@/lib/overview";
import { CardHead, EmptyState, OverviewCard, plural } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

export async function ShoppingCard({ student, copy }: { student: User; copy: Copy }) {
  const shopping = await getOverviewShopping(student);
  // Null means selling is switched off system-wide — the whole card goes,
  // matching how the sidebar drops its entire "Mua sắm" run in that state.
  if (!shopping) return null;

  return (
    <OverviewCard>
      <CardHead title={copy.shoppingTitle} action={{ href: "/dashboard/orders", label: copy.shoppingViewOrders }} />

      {shopping.latestOrder ? (
        <Link
          href={`/dashboard/orders/${shopping.latestOrder.id}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-faint-bg px-3.5 py-3 transition-colors hover:border-primary-border-hover"
        >
          <span className="min-w-0 flex-1">
            <b className="font-mono text-[13px] font-medium text-foreground">{shopping.latestOrder.code}</b>
            <span className="mt-0.5 block text-xs text-muted">
              {shopping.latestOrder.itemCount}{" "}
              {plural(shopping.latestOrder.itemCount, copy.unitItemOne, copy.unitItemMany)} ·{" "}
              {formatVND(shopping.latestOrder.totalAmount)}
            </span>
          </span>
          {/* ORDER_STATUS_LABELS is Vietnamese-only, like every other order
              screen in this app — deliberately not re-translated here so one
              status can't read differently in two places. */}
          <Badge color={ORDER_STATUS_BADGE_COLOR[shopping.latestOrder.status]}>
            {ORDER_STATUS_LABELS[shopping.latestOrder.status]}
          </Badge>
        </Link>
      ) : (
        <EmptyState icon={<Receipt className="h-4 w-4" aria-hidden="true" />} body={copy.shoppingNoOrders} />
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-[13px]">
        <span className="min-w-0 flex-1">
          {shopping.cart.count > 0 ? (
            <>
              <b className="font-medium text-foreground tabular-nums">
                {copy.cartLabel}: {shopping.cart.count}
              </b>
              <span className="mt-0.5 block text-xs text-muted">
                {copy.cartSubtotal} {formatVND(shopping.cart.subtotal)}
              </span>
            </>
          ) : (
            <span className="text-muted">{copy.cartEmpty}</span>
          )}
        </span>
        <Link
          href="/dashboard/cart"
          className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          {copy.actionView}
        </Link>
      </div>

      {shopping.justUnlocked.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{copy.justUnlockedLabel}</span>
            <Badge color="success">{copy.badgeNew}</Badge>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {shopping.justUnlocked.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="inline-flex max-w-[14rem] items-center rounded-full bg-accent-bg px-2.5 py-1 text-xs font-medium text-accent-hover transition-colors hover:bg-primary-bg"
                >
                  <span className="truncate">{product.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </OverviewCard>
  );
}
