"use client";

import { useEffect } from "react";
import { useCelebrate } from "@/components/ui/toast";
import { levelRank, parseLevel } from "@/lib/levels";
import type { Level } from "@prisma/client";

// Keyed per-student — shared/public machines can have more than one
// student log in from the same browser, and localStorage is scoped to the
// origin, not the account, so an unscoped key would leak a false "level up"
// celebration onto the next student who logs in.
function storageKey(studentId: string) {
  return `lms-last-seen-level-${studentId}`;
}

// Level-up approvals happen in the admin console, in a different session
// than the student's — there's no live push channel to notify them the
// moment it happens. Instead we compare the level rendered on this load
// against the last one this browser saw for this student; if it climbed,
// the student must have just been approved (or leveled up) since their
// last visit here.
export function LevelUpWatcher({
  studentId,
  level,
  label,
}: {
  studentId: string;
  level: Level;
  label: string;
}) {
  const celebrate = useCelebrate();

  useEffect(() => {
    const key = storageKey(studentId);
    const stored = parseLevel(window.localStorage.getItem(key) ?? "");
    if (stored && levelRank(level) > levelRank(stored)) {
      celebrate({ title: "Chúc mừng bạn đã lên cấp!", description: `Bạn hiện đang ở ${label}.` });
    }
    window.localStorage.setItem(key, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, level]);

  return null;
}
