"use server";

import { revalidatePath } from "next/cache";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isMaxLevel, nextLevel } from "@/lib/levels";
import { getIncompleteQuizzesForLevel } from "@/lib/level-completion";

export async function requestLevelUpAction() {
  const student = await requireActiveStudent();

  // Only one open request at a time.
  const pending = await prisma.levelUpRequest.findFirst({
    where: { studentId: student.id, status: "PENDING" },
  });
  if (pending) {
    return;
  }

  if (isMaxLevel(student.grantedLevel)) {
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

  // Every surface that renders the gate has to drop its cached "you may
  // request" state once the request exists: the level-up page and the
  // roadmap both show LevelUpPanel, and the overview's learning card shows
  // the same condition in its own words.
  revalidatePath("/dashboard/level-up");
  revalidatePath("/dashboard/lo-trinh");
  revalidatePath("/dashboard");
}
