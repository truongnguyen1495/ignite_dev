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
