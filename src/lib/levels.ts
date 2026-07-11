import { Level } from "@prisma/client";

export const LEVEL_ORDER: Record<Level, number> = {
  CUSTOMER: 1,
  NEW_STARTER: 2,
  JUNIOR: 3,
  SENIOR: 4,
  CORE_LEADER: 5,
};

export const LEVEL_LABELS: Record<Level, string> = {
  CUSTOMER: "Cấp 1: Customer",
  NEW_STARTER: "Cấp 2: New starter",
  JUNIOR: "Cấp 3: Junior",
  SENIOR: "Cấp 4: Senior",
  CORE_LEADER: "Cấp 5: Core leader",
};

export const LEVEL_NAMES: Record<Level, string> = {
  CUSTOMER: "Customer",
  NEW_STARTER: "New starter",
  JUNIOR: "Junior",
  SENIOR: "Senior",
  CORE_LEADER: "Core leader",
};

export const ORDERED_LEVELS: Level[] = (
  Object.keys(LEVEL_ORDER) as Level[]
).sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b]);

export function levelRank(level: Level): number {
  return LEVEL_ORDER[level];
}

// grantedLevel is null for a "no cấp" account (not on the 5-level ladder at
// all) — it satisfies no level threshold, so this returns false immediately
// rather than indexing LEVEL_ORDER with a non-existent key.
export function hasLevelAccess(grantedLevel: Level | null, requestedLevel: Level): boolean {
  if (grantedLevel === null) return false;
  return levelRank(grantedLevel) >= levelRank(requestedLevel);
}

export function nextLevel(current: Level): Level | null {
  const rank = levelRank(current);
  const next = ORDERED_LEVELS.find((l) => levelRank(l) === rank + 1);
  return next ?? null;
}

export function isMaxLevel(level: Level): boolean {
  return levelRank(level) === ORDERED_LEVELS.length;
}

export function parseLevel(value: string): Level | null {
  return (ORDERED_LEVELS as string[]).includes(value) ? (value as Level) : null;
}

// Sentinel <select> value representing "no cấp" (grantedLevel: null) in the
// admin create/edit student forms — not a real Level, since the enum has no
// such member. Shared between the forms and their server actions so both
// sides agree on the exact string.
export const NO_LEVEL_VALUE = "NONE";
