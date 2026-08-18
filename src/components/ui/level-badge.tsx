import type { Level } from "@prisma/client";
import { Badge, type BadgeColor } from "./badge";
import { LEVEL_ORDER, LEVEL_LABELS } from "@/lib/levels";

const LEVEL_COLORS: Record<Level, BadgeColor> = {
  VISITOR: "level0",
  REGISTERED_MEMBER: "level1",
  IGNITE_MEMBER: "level2",
  CUSTOMER: "level3",
  BUSINESS_BUILDER: "level4",
  TEAM_PARTNER: "level5",
};

export function LevelBadge({ level, full = false }: { level: Level; full?: boolean }) {
  return (
    <Badge color={LEVEL_COLORS[level]}>
      {full ? LEVEL_LABELS[level] : `CẤP ${LEVEL_ORDER[level]}`}
    </Badge>
  );
}
