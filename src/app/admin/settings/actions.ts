"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  passPercentage: z.coerce.number().int().min(1, "Phải từ 1 đến 100.").max(100, "Phải từ 1 đến 100."),
});

export async function updateSettingsAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = settingsSchema.safeParse({
    passPercentage: formData.get("passPercentage"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { passPercentage: parsed.data.passPercentage },
    create: { id: 1, passPercentage: parsed.data.passPercentage },
  });

  revalidatePath("/admin/settings");
  return undefined;
}
