import { AnnouncementCategory, Level } from "@prisma/client";
import { hasLevelAccess } from "@/lib/levels";

export const ORDERED_ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "IMPORTANT",
  "UPDATE",
  "GENERAL",
];

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  IMPORTANT: "Quan trọng",
  UPDATE: "Cập nhật",
  GENERAL: "Tin tức",
};

export const ANNOUNCEMENT_CATEGORY_BADGE_COLOR: Record<AnnouncementCategory, "danger" | "info" | "muted"> = {
  IMPORTANT: "danger",
  UPDATE: "info",
  GENERAL: "muted",
};

// Single source of truth for "can this logged-in student see this
// announcement" — khách (guest) visibility is a separate, independent flag
// (visibleToGuest) not covered here; see requireGuestAnnouncementAccess in
// src/lib/access.ts. Does NOT check visibleToStudents (the master hide
// switch) — callers combine that separately since it applies before this.
export function announcementVisibleTo(
  announcement: { visibleToProspective: boolean; visibleToLeveled: boolean; minLevel: Level | null },
  grantedLevel: Level | null
): boolean {
  if (grantedLevel === null) {
    return announcement.visibleToProspective;
  }
  return announcement.visibleToLeveled && (!announcement.minLevel || hasLevelAccess(grantedLevel, announcement.minLevel));
}
