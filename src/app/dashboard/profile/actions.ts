"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { phoneNumberSchema } from "@/lib/validation";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Họ và tên không được để trống."),
  dateOfBirth: z.coerce
    .date()
    .refine((date) => !Number.isNaN(date.getTime()), "Ngày sinh không hợp lệ.")
    .refine((date) => date.getTime() <= Date.now(), "Ngày sinh không được ở tương lai."),
  phoneNumber: phoneNumberSchema,
});

export async function updateOwnProfileAction(input: {
  name: string;
  dateOfBirth: string;
  phoneNumber: string;
}): Promise<string | undefined> {
  const student = await requireActiveStudent();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  try {
    await prisma.user.update({
      where: { id: student.id },
      data: {
        name: parsed.data.name,
        dateOfBirth: parsed.data.dateOfBirth,
        phoneNumber: parsed.data.phoneNumber,
      },
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
