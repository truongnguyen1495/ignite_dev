"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function setChatEnabledAction(chatEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { chatEnabled },
    create: { id: 1, chatEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function setRegistrationEnabledAction(registrationEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { registrationEnabled },
    create: { id: 1, registrationEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function setEmailVerificationEnabledAction(emailVerificationEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { emailVerificationEnabled },
    create: { id: 1, emailVerificationEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function setGoogleLoginEnabledAction(googleLoginEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { googleLoginEnabled },
    create: { id: 1, googleLoginEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function setBilingualEnabledAction(bilingualEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { bilingualEnabled },
    create: { id: 1, bilingualEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function setSalesEnabledAction(salesEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { salesEnabled },
    create: { id: 1, salesEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function setAutoPaymentEnabledAction(autoPaymentEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { autoPaymentEnabled },
    create: { id: 1, autoPaymentEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function setWhiteboardsEnabledAction(whiteboardsEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { whiteboardsEnabled },
    create: { id: 1, whiteboardsEnabled },
  });
  revalidatePath("/admin/settings");
}

const bankInfoSchema = z.object({
  bankName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankAccountHolder: z.string().trim().optional(),
  bankQrImageUrl: z.string().trim().optional(),
});

export async function setBankInfoAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = bankInfoSchema.safeParse({
    bankName: formData.get("bankName") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    bankAccountHolder: formData.get("bankAccountHolder") || undefined,
    bankQrImageUrl: formData.get("bankQrImageUrl") || undefined,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      bankName: parsed.data.bankName ?? null,
      bankAccountNumber: parsed.data.bankAccountNumber ?? null,
      bankAccountHolder: parsed.data.bankAccountHolder ?? null,
      bankQrImageUrl: parsed.data.bankQrImageUrl ?? null,
    },
    create: {
      id: 1,
      bankName: parsed.data.bankName ?? null,
      bankAccountNumber: parsed.data.bankAccountNumber ?? null,
      bankAccountHolder: parsed.data.bankAccountHolder ?? null,
      bankQrImageUrl: parsed.data.bankQrImageUrl ?? null,
    },
  });
  revalidatePath("/admin/settings");
  return undefined;
}

const lessonWatchSettingsSchema = z.object({
  lessonWatchThresholdPercent: z.coerce.number().int().min(1, "Ngưỡng phải từ 1 đến 100.").max(100, "Ngưỡng phải từ 1 đến 100."),
});

export async function setLessonWatchSettingsAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = lessonWatchSettingsSchema.safeParse({
    lessonWatchThresholdPercent: formData.get("lessonWatchThresholdPercent"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const data = {
    lessonWatchThresholdPercent: parsed.data.lessonWatchThresholdPercent,
    showLessonWatchProgressToGuest: formData.get("showLessonWatchProgressToGuest") === "on",
    enforceLessonWatchForHocVien: formData.get("enforceLessonWatchForHocVien") === "on",
  };

  await prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  revalidatePath("/admin/settings");
  return undefined;
}

// Both numbers are plain non-negative integers rather than anything
// cleverer: a fee is đồng (no decimals in practice), and the threshold is a
// count of items. 0 is meaningful for both — free delivery for everyone,
// and "no free-shipping offer at all" respectively — so neither has a
// minimum of 1.
const shippingSettingsSchema = z.object({
  shippingFee: z.coerce
    .number()
    .int("Phí vận chuyển phải là số nguyên.")
    .min(0, "Phí vận chuyển không được âm.")
    .max(100_000_000, "Phí vận chuyển quá lớn."),
  freeShippingFromItems: z.coerce
    .number()
    .int("Số sản phẩm phải là số nguyên.")
    .min(0, "Số sản phẩm không được âm.")
    .max(999, "Số sản phẩm quá lớn."),
});

export async function setShippingSettingsAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = shippingSettingsSchema.safeParse({
    shippingFee: formData.get("shippingFee"),
    freeShippingFromItems: formData.get("freeShippingFromItems"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  // Only the settings screen: existing orders keep the fee they were
  // charged (Order.shippingFee), and the checkout screen reads this row
  // fresh on every visit, so there is nothing else holding a stale copy.
  revalidatePath("/admin/settings");
  return undefined;
}
