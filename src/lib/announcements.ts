import { AnnouncementCategory } from "@prisma/client";

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
