"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { phoneNumberSchema } from "@/lib/validation";

const profileSchema = z.object({
  shopName: z.string().trim().min(1, "Tên gian hàng không được để trống."),
  logoUrl: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  contactEmail: z.string().trim().email("Email không hợp lệ."),
  contactPhone: phoneNumberSchema,
  bankName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankAccountHolder: z.string().trim().optional(),
});

// Note slug is deliberately never editable here — see Vendor.slug's own
// comment: generated once at application time and never regenerated, so a
// shared /shop/[slug] link never breaks even after a rename.
export async function updateVendorProfileAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const { vendor } = await requireVendorAccountAccess();
  const parsed = profileSchema.safeParse({
    shopName: formData.get("shopName"),
    logoUrl: formData.get("logoUrl") || undefined,
    bio: formData.get("bio") || undefined,
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    bankName: formData.get("bankName") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    bankAccountHolder: formData.get("bankAccountHolder") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      shopName: parsed.data.shopName,
      logoUrl: parsed.data.logoUrl ?? null,
      bio: parsed.data.bio ?? null,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone,
      bankName: parsed.data.bankName ?? null,
      bankAccountNumber: parsed.data.bankAccountNumber ?? null,
      bankAccountHolder: parsed.data.bankAccountHolder ?? null,
    },
  });

  revalidatePath("/vendor/ho-so");
  revalidatePath("/vendor");
  revalidatePath(`/shop/${vendor.slug}`);
  return undefined;
}

/**
 * Vendor's own self-service pause — distinct from admin's suspendedAt lock
 * (see the Vendor model's own comment: either one hides every listing, but
 * only the vendor can clear this one and only an admin can clear that one).
 * Toggles rather than two separate actions since the button is one pill that
 * flips state either way.
 */
export async function toggleVendorPauseAction(): Promise<void> {
  const { vendor: vendorSummary } = await requireVendorAccountAccess();
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorSummary.id }, select: { pausedAt: true } });
  if (!vendor) return;
  await prisma.vendor.update({
    where: { id: vendorSummary.id },
    data: { pausedAt: vendor.pausedAt ? null : new Date() },
  });
  revalidatePath("/vendor/ho-so");
  revalidatePath("/vendor");
}
