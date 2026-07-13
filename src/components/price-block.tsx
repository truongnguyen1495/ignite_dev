import { formatVND } from "@/lib/currency";

// Shared by course-list.tsx/library-list.tsx's purchase footers, right next
// to a BuyButton — giá khuyến mãi (or giá gốc if no discount) on top, giá
// gốc gạch ngang smaller below when there's an actual discount.
export function PriceBlock({ price, originalPrice }: { price: number; originalPrice?: number | null }) {
  return (
    <div className="leading-tight">
      <span className="block text-sm font-semibold text-primary">{formatVND(price)}</span>
      {originalPrice != null && (
        <span className="block text-[10px] text-dark-muted line-through">{formatVND(originalPrice)}</span>
      )}
    </div>
  );
}
