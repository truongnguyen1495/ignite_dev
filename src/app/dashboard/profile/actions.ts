"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { phoneNumberSchema } from "@/lib/validation";

export async function updateOwnPhoneNumberAction(phoneNumber: string): Promise<string | undefined> {
  const student = await requireActiveStudent();

  const parsed = phoneNumberSchema.safeParse(phoneNumber);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  try {
    await prisma.user.update({
      where: { id: student.id },
      data: { phoneNumber: parsed.data },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return "Số điện thoại này đã được sử dụng.";
    }
    throw e;
  }

  revalidatePath("/dashboard/profile");
  return undefined;
}
