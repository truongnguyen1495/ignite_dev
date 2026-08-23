import type { VendorApplicationStatus, CommissionStatus, PayoutRequestStatus } from "@prisma/client";

// Pure helpers for the "Nhà bán hàng" marketplace — no Prisma import, safe
// for Client Components, same convention as src/lib/groups.ts and
// src/lib/orders.ts. Business rules that touch the database live in
// src/lib/vendor-commission.ts (server-only) instead.

export const VENDOR_APPLICATION_STATUS_LABELS: Record<VendorApplicationStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Sẵn sàng rút",
  PAID: "Đã rút",
  CANCELLED: "Đã thu hồi",
};

export const PAYOUT_REQUEST_STATUS_LABELS: Record<PayoutRequestStatus, string> = {
  PENDING: "Đang xử lý",
  PAID: "Đã chuyển khoản",
  REJECTED: "Bị từ chối",
};

/**
 * Whether a vendor's listings should be visible/purchasable right now —
 * checked wherever Product/Course/LibraryItem visibility is computed for a
 * row that has a sellerId. Every one of the three conditions independently
 * hides every listing: application not (yet) approved, vendor's own
 * self-pause, or an admin lock. A row's own vendorHiddenAt (per-item
 * takedown) is checked separately by the caller, not here, since that's a
 * property of the listing, not the vendor.
 */
export function isVendorActive(
  vendor: { applicationStatus: VendorApplicationStatus; pausedAt: Date | null; suspendedAt: Date | null } | null
): boolean {
  if (!vendor) return false;
  return vendor.applicationStatus === "APPROVED" && !vendor.pausedAt && !vendor.suspendedAt;
}

// Slug for the public storefront (/shop/[slug]) — generated once at
// application time from shopName and never regenerated, so a shared link
// never breaks even if the shop is later renamed. Strips Vietnamese
// diacritics the same way any "tên -> URL slug" conversion must, since a raw
// Vietnamese title is not a valid path segment.
export function slugifyShopName(shopName: string): string {
  const base = shopName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, (m) => (m === "đ" ? "d" : "D"))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "gian-hang";
}

/**
 * % RapidX keeps for a given vendor right now — the override if the vendor
 * has one, otherwise the platform default. Callers that CREATE a Commission
 * row must snapshot this value onto the row itself (Commission.commissionPercent)
 * rather than re-resolve it later; this function is only for "what rate
 * would apply if a sale happened right now."
 */
export function resolveCommissionPercent(
  vendor: { commissionPercentOverride: number | null },
  platformDefaultPercent: number
): number {
  return vendor.commissionPercentOverride ?? platformDefaultPercent;
}

/** Splits a line's gross amount into what the platform keeps vs. what the vendor gets, rounding down so the two always sum to exactly grossAmount. */
export function splitCommission(grossAmount: number, commissionPercent: number): { platformAmount: number; vendorAmount: number } {
  const platformAmount = Math.floor((grossAmount * commissionPercent) / 100);
  return { platformAmount, vendorAmount: grossAmount - platformAmount };
}
