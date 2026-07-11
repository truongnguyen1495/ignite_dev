import type { AdminPermissionKind } from "@prisma/client";

export const ORDERED_ADMIN_PERMISSIONS: AdminPermissionKind[] = [
  "MANAGE_COURSES",
  "MANAGE_LESSONS_QUIZZES",
  "MANAGE_LIBRARY",
  "MANAGE_STUDENTS",
  "MANAGE_CHAT",
  "MANAGE_LEVEL_UP_REQUESTS",
  "MANAGE_RESULTS",
  "MANAGE_ANNOUNCEMENTS",
];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionKind, string> = {
  MANAGE_COURSES: "Khóa học độc quyền",
  MANAGE_LESSONS_QUIZZES: "Bài học & bài test",
  MANAGE_LIBRARY: "Thư viện",
  MANAGE_STUDENTS: "Học viên",
  MANAGE_CHAT: "Chat & hỗ trợ",
  MANAGE_LEVEL_UP_REQUESTS: "Yêu cầu lên cấp",
  MANAGE_RESULTS: "Kết quả bài test",
  MANAGE_ANNOUNCEMENTS: "Bản tin",
};
