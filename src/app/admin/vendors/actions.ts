"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { approveVendorPayout, rejectVendorPayout } from "@/lib/vendor-commission";

// Every action here goes through requireAdminPermission("MANAGE_VENDORS") —
// the admin-side counterpart to the vendor's own requireVendorAccountAccess()
// gate, per the split documented on that function in src/lib/access.ts.

export async function approveVendorApplicationAction(vendorId: string): Promise<void> {
  const admin = await requireAdminPermission("MANAGE_VENDORS");
  await prisma.vendor.updateMany({
    where: { id: vendorId, applicationStatus: "PENDING" },
    data: { applicationStatus: "APPROVED", reviewedAt: new Date(), reviewedById: admin.id, reviewNote: null },
  });
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/vendors/pending");
  revalidatePath(`/admin/vendors/${vendorId}`);
}

export async function rejectVendorApplicationAction(vendorId: string, reviewNote: string): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_VENDORS");
  const trimmed = reviewNote.trim();
  if (!trimmed) return "Vui lòng nhập lý do từ chối.";

  await prisma.vendor.updateMany({
    where: { id: vendorId, applicationStatus: "PENDING" },
    data: { applicationStatus: "REJECTED", reviewedAt: new Date(), reviewedById: admin.id, reviewNote: trimmed },
  });
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/vendors/pending");
  return undefined;
}

export async function setVendorCommissionOverrideAction(
  vendorId: string,
  percentRaw: string
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_VENDORS");
  const trimmed = percentRaw.trim();
  // Blank clears the override back to Settings.vendorDefaultCommissionPercent
  // — see resolveCommissionPercent in src/lib/vendor.ts for the fallback.
  if (trimmed === "") {
    await prisma.vendor.update({ where: { id: vendorId }, data: { commissionPercentOverride: null } });
    revalidatePath(`/admin/vendors/${vendorId}`);
    return undefined;
  }
  const percent = Number(trimmed);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    return "Tỉ lệ hoa hồng phải là số nguyên từ 0 đến 100.";
  }
  await prisma.vendor.update({ where: { id: vendorId }, data: { commissionPercentOverride: percent } });
  revalidatePath(`/admin/vendors/${vendorId}`);
  return undefined;
}

export async function suspendVendorAction(vendorId: string, reason: string): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_VENDORS");
  const trimmed = reason.trim();
  if (!trimmed) return "Vui lòng nhập lý do khoá gian hàng.";

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { suspendedAt: new Date(), suspendedById: admin.id, suspendReason: trimmed },
  });
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  return undefined;
}

// Only an admin can clear this — distinct from the vendor's own
// toggleVendorPauseAction, which only ever touches pausedAt (see the Vendor
// model's own comment on the split).
export async function unsuspendVendorAction(vendorId: string): Promise<void> {
  await requireAdminPermission("MANAGE_VENDORS");
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { suspendedAt: null, suspendedById: null, suspendReason: null },
  });
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
}

type ListingKind = "PRODUCT" | "COURSE" | "LIBRARY_ITEM";

/**
 * Post-hoc moderation only — hides a vendor's already-live listing with a
 * reason, shown back to the vendor on their own /vendor/san-pham list (see
 * that page's adminHidden/vendorHiddenReason rendering). Never edits the
 * listing's own content, per the "no pre-publish review" decision.
 */
export async function hideVendorListingAction(kind: ListingKind, itemId: string, reason: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_VENDORS");
  const trimmed = reason.trim();
  if (!trimmed) return "Vui lòng nhập lý do ẩn.";

  // updateMany + sellerId: { not: null }, not a plain update by id — this
  // action's whole point is a vendor-listing takedown lever, so it must
  // never be usable (by a stray id, however unlikely) to stamp
  // vendorHiddenAt onto one of the platform's own rows.
  const data = { vendorHiddenAt: new Date(), vendorHiddenReason: trimmed };
  const where = { id: itemId, sellerId: { not: null } };
  if (kind === "PRODUCT") await prisma.product.updateMany({ where, data });
  else if (kind === "COURSE") await prisma.course.updateMany({ where, data });
  else await prisma.libraryItem.updateMany({ where, data });

  revalidatePath("/admin/vendors");
  revalidatePath("/vendor/san-pham");
  return undefined;
}

export async function unhideVendorListingAction(kind: ListingKind, itemId: string): Promise<void> {
  await requireAdminPermission("MANAGE_VENDORS");
  const data = { vendorHiddenAt: null, vendorHiddenReason: null };
  const where = { id: itemId, sellerId: { not: null } };
  if (kind === "PRODUCT") await prisma.product.updateMany({ where, data });
  else if (kind === "COURSE") await prisma.course.updateMany({ where, data });
  else await prisma.libraryItem.updateMany({ where, data });

  revalidatePath("/admin/vendors");
  revalidatePath("/vendor/san-pham");
}

// --- Rút tiền (PayoutRequest) ------------------------------------------------

export async function approvePayoutRequestAction(payoutRequestId: string): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_VENDORS");
  const result = await approveVendorPayout(payoutRequestId, admin.id);
  if (!result.error) {
    revalidatePath("/admin/vendors/payouts");
    revalidatePath("/admin/finance");
  }
  return result;
}

export async function rejectPayoutRequestAction(payoutRequestId: string, reason: string): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_VENDORS");
  const trimmed = reason.trim();
  if (!trimmed) return { error: "Vui lòng nhập lý do từ chối." };
  const result = await rejectVendorPayout(payoutRequestId, admin.id, trimmed);
  if (!result.error) {
    revalidatePath("/admin/vendors/payouts");
  }
  return result;
}
