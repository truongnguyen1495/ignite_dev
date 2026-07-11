import type { Level } from "@prisma/client";
import { Badge, type BadgeColor } from "./badge";
import { LEVEL_ORDER, LEVEL_LABELS } from "@/lib/levels";

const LEVEL_COLORS: Record<Level, BadgeColor> = {
  CUSTOMER: "level1",
  NEW_STARTER: "level2",
  JUNIOR: "level3",
  SENIOR: "level4",
  CORE_LEADER: "level5",
};

export function LevelBadge({ level, full = false }: { level: Level | null; full?: boolean }) {
  if (!level) {
    return <Badge color="muted">{full ? "Chưa xếp cấp" : "—"}</Badge>;
  }
  return (
    <Badge color={LEVEL_COLORS[level]}>
      {full ? LEVEL_LABELS[level] : `CẤP ${LEVEL_ORDER[level]}`}
    </Badge>
  );
}
