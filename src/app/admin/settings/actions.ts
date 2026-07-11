"use server";

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
