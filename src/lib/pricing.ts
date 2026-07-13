// Pure, framework-agnostic — imported from both server (actions, page data
// loaders) and client components (course-list/library-list, BuyButton), so
// no "server-only" import and no dependency on prisma's generated types
// beyond the plain shape below.
export type Priceable = { price: number; salePrice: number | null };

export type Pricing =
  | { forSale: false }
  | { forSale: true; chargeAmount: number; originalPrice: number | null };

// salePrice only takes effect when it's a positive number strictly below
// price — anything else (0, negative, >= price) is treated as "no discount"
// rather than surfaced as a validation error here, since this also runs on
// stored data that may predate stricter form validation.
export function getPricing(item: Priceable): Pricing {
  if (item.price <= 0) {
    return { forSale: false };
  }
  const hasDiscount = item.salePrice !== null && item.salePrice > 0 && item.salePrice < item.price;
  return {
    forSale: true,
    chargeAmount: hasDiscount ? item.salePrice! : item.price,
    originalPrice: hasDiscount ? item.price : null,
  };
}
