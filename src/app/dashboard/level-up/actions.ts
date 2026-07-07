"use server";

import { revalidatePath } from "next/cache";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isMaxLevel, nextLevel } from "@/lib/levels";
import { getIncompleteQuizzesForLevel } from "@/lib/level-completion";

export async function requestLevelUpAction() {
  const student = await requireActiveStudent();

  if (isMaxLevel(student.grantedLevel)) {
    return;
  }

  const pending = await prisma.levelUpRequest.findFirst({
    where: { studentId: student.id, status: "PENDING" },
  });
  if (pending) {
    return;
  }

  // Backend gate, not just a disabled button: a student must have a passing
  // attempt on every quiz at their current level before they can request the
  // next one, even if they submit the request directly bypassing the UI.
  const incomplete = await getIncompleteQuizzesForLevel(student.id, student.grantedLevel);
  if (incomplete.length > 0) {
    return;
  }

  const toLevel = nextLevel(student.grantedLevel);
  if (!toLevel) {
    return;
  }

  await prisma.levelUpRequest.create({
    data: {
      studentId: student.id,
      fromLevel: student.grantedLevel,
      toLevel,
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard/level-up");
}
