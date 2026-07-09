"use client";

import { useEffect } from "react";
import { useCelebrate } from "@/components/ui/toast";
import { levelRank, parseLevel } from "@/lib/levels";
import type { Level } from "@prisma/client";

const STORAGE_KEY = "lms-last-seen-level";

// Level-up approvals happen in the admin console, in a different session
// than the student's — there's no live push channel to notify them the
// moment it happens. Instead we compare the level rendered on this load
// against the last one this browser saw; if it climbed, the student must
// have just been approved (or leveled up) since their last visit here.
export function LevelUpWatcher({ level, label }: { level: Level; label: string }) {
  const celebrate = useCelebrate();

  useEffect(() => {
    const stored = parseLevel(window.localStorage.getItem(STORAGE_KEY) ?? "");
    if (stored && levelRank(level) > levelRank(stored)) {
      celebrate({ title: "Chúc mừng bạn đã lên cấp!", description: `Bạn hiện đang ở ${label}.` });
    }
    window.localStorage.setItem(STORAGE_KEY, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return null;
}
