"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function markConsultationContactedAction(id: string) {
  await requireAdminPermission("MANAGE_PRODUCTS");
  await prisma.consultationRequest.update({ where: { id }, data: { contactedAt: new Date() } });
  revalidatePath("/admin/consultations");
}

export async function unmarkConsultationContactedAction(id: string) {
  await requireAdminPermission("MANAGE_PRODUCTS");
  await prisma.consultationRequest.update({ where: { id }, data: { contactedAt: null } });
  revalidatePath("/admin/consultations");
}
