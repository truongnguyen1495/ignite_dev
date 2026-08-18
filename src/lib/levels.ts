import { Level } from "@prisma/client";

// Single source of truth for the ladder. The enum in schema.prisma is
// declared in this same order, but nothing derives rank from enum position —
// LEVEL_ORDER is what every access check, badge and sort reads.
//
// Ranks start at 0, not 1: Cấp 0 (Visitor) is a real, grantable level for an
// account that has registered but been given nothing yet, so "rank" and
// "how many levels exist" are deliberately not the same number. Anything
// asking "is this the top?" must compare against the last entry of
// ORDERED_LEVELS (see isMaxLevel), never against ORDERED_LEVELS.length.
export const LEVEL_ORDER: Record<Level, number> = {
  VISITOR: 0,
  REGISTERED_MEMBER: 1,
  IGNITE_MEMBER: 2,
  CUSTOMER: 3,
  BUSINESS_BUILDER: 4,
  TEAM_PARTNER: 5,
};

export const LEVEL_NAMES: Record<Level, string> = {
  VISITOR: "Visitor",
  REGISTERED_MEMBER: "Registered Member",
  IGNITE_MEMBER: "Ignite Member",
  CUSTOMER: "Customer",
  BUSINESS_BUILDER: "Business Builder",
  TEAM_PARTNER: "Team Partner",
};

export const LEVEL_LABELS: Record<Level, string> = {
  VISITOR: "Cấp 0: Visitor",
  REGISTERED_MEMBER: "Cấp 1: Registered Member",
  IGNITE_MEMBER: "Cấp 2: Ignite Member",
  CUSTOMER: "Cấp 3: Customer",
  BUSINESS_BUILDER: "Cấp 4: Business Builder",
  TEAM_PARTNER: "Cấp 5: Team Partner",
};

// The level a brand-new account starts on. Deliberately Cấp 1, not Cấp 0:
// registering IS the act that makes someone a Registered Member, and every
// account that existed before the six-tier ladder landed on this rank too, so
// new and old members stay comparable. Cấp 0 exists for an admin to place
// someone below that.
export const DEFAULT_LEVEL: Level = "REGISTERED_MEMBER";

export const ORDERED_LEVELS: Level[] = (
  Object.keys(LEVEL_ORDER) as Level[]
).sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b]);

export const TOP_LEVEL: Level = ORDERED_LEVELS[ORDERED_LEVELS.length - 1];

export function levelRank(level: Level): number {
  return LEVEL_ORDER[level];
}

export function hasLevelAccess(grantedLevel: Level, requestedLevel: Level): boolean {
  return levelRank(grantedLevel) >= levelRank(requestedLevel);
}

export function nextLevel(current: Level): Level | null {
  const rank = levelRank(current);
  const next = ORDERED_LEVELS.find((l) => levelRank(l) === rank + 1);
  return next ?? null;
}

export function isMaxLevel(level: Level): boolean {
  return nextLevel(level) === null;
}

export function parseLevel(value: string): Level | null {
  return (ORDERED_LEVELS as string[]).includes(value) ? (value as Level) : null;
}
