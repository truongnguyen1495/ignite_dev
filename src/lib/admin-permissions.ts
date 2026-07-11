import type { AdminPermissionKind } from "@prisma/client";

// Standalone permissions — each is one checkbox, no children. The two
// student-related ones (MANAGE_STUDENTS/MANAGE_PROSPECTIVE_STUDENTS) are
// deliberately excluded here — they're rendered as group parents instead,
// see STUDENT_PERMISSION_GROUPS below.
export const ORDERED_ADMIN_PERMISSIONS: AdminPermissionKind[] = [
  "MANAGE_COURSES",
  "MANAGE_LESSONS_QUIZZES",
  "MANAGE_LIBRARY",
  "MANAGE_CHAT",
  "MANAGE_LEVEL_UP_REQUESTS",
  "MANAGE_RESULTS",
  "MANAGE_ANNOUNCEMENTS",
];

export type PermissionGroup = {
  parent: AdminPermissionKind;
  children: AdminPermissionKind[];
};

// MANAGE_STUDENTS/MANAGE_PROSPECTIVE_STUDENTS only grant viewing the
// list/detail page and creating new accounts — editing, locking, and
// deleting an existing one are separate, independently grantable
// capabilities nested under the parent in the permission editor UI (e.g.
// an admin can be trusted to edit + lock but never delete). See the
// permission checks in src/app/admin/students/actions.ts.
export const STUDENT_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    parent: "MANAGE_STUDENTS",
    children: ["EDIT_STUDENTS", "LOCK_STUDENTS", "DELETE_STUDENTS", "DEMOTE_STUDENTS"],
  },
  {
    parent: "MANAGE_PROSPECTIVE_STUDENTS",
    children: ["EDIT_PROSPECTIVE_STUDENTS", "LOCK_PROSPECTIVE_STUDENTS", "DELETE_PROSPECTIVE_STUDENTS"],
  },
];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionKind, string> = {
  MANAGE_COURSES: "Khóa học độc quyền",
  MANAGE_LESSONS_QUIZZES: "Bài học & bài test",
  MANAGE_LIBRARY: "Thư viện",
  MANAGE_STUDENTS: "Học viên (xem danh sách & tạo mới)",
  MANAGE_PROSPECTIVE_STUDENTS: "Học sinh (xem danh sách & tạo mới)",
  EDIT_STUDENTS: "Sửa học viên",
  LOCK_STUDENTS: "Khóa học viên",
  DELETE_STUDENTS: "Xóa học viên",
  DEMOTE_STUDENTS: "Đẩy về học sinh",
  EDIT_PROSPECTIVE_STUDENTS: "Sửa học sinh",
  LOCK_PROSPECTIVE_STUDENTS: "Khóa học sinh",
  DELETE_PROSPECTIVE_STUDENTS: "Xóa học sinh",
  MANAGE_CHAT: "Chat & hỗ trợ",
  MANAGE_LEVEL_UP_REQUESTS: "Yêu cầu lên cấp",
  MANAGE_RESULTS: "Kết quả bài test",
  MANAGE_ANNOUNCEMENTS: "Bản tin",
};
