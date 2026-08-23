import type { AdminPermissionKind } from "@prisma/client";

// Standalone permissions — each is one checkbox, no children. The two
// student-related ones (MANAGE_STUDENTS/MANAGE_PROSPECTIVE_STUDENTS) and
// the three nested under "Thành viên" below (MANAGE_LESSONS_QUIZZES/
// MANAGE_RESULTS/MANAGE_LEVEL_UP_REQUESTS) are deliberately excluded here —
// they're rendered as group parents/children instead, see
// STUDENT_PERMISSION_GROUPS. This is a UI-grouping-only change: each
// permission's own gate (requireAdminPermission("MANAGE_RESULTS") etc.) is
// unaffected, only where its checkbox appears in this editor.
export const ORDERED_ADMIN_PERMISSIONS: AdminPermissionKind[] = [
  "MANAGE_COURSES",
  "MANAGE_LIBRARY",
  "MANAGE_PRODUCTS",
  "MANAGE_CHAT",
  "MANAGE_ANNOUNCEMENTS",
  "MANAGE_ORDERS",
  "MANAGE_FINANCE",
  "MANAGE_GROUPS",
  "MANAGE_TESTS",
  "MANAGE_MINIGAME",
  "MANAGE_VENDORS",
];

export type PermissionGroup = {
  parent: AdminPermissionKind;
  children: AdminPermissionKind[];
};

// MANAGE_STUDENTS only grants viewing the list/detail page and creating new
// accounts — editing, locking, and deleting an existing one are separate,
// independently grantable capabilities nested under the parent in the
// permission editor UI (e.g. an admin can be trusted to edit + lock but
// never delete). See the permission checks in
// src/app/admin/students/actions.ts. Bài học/Kết quả/Yêu cầu lên cấp are
// grouped under "Thành viên" too, per user request — same content-vs-5-cấp
// relationship that already grouped them under "Thành viên" in the admin
// sidebar nav (admin/layout.tsx).
export const STUDENT_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    parent: "MANAGE_STUDENTS",
    children: [
      "EDIT_STUDENTS",
      "LOCK_STUDENTS",
      "DELETE_STUDENTS",
      "MANAGE_LESSONS_QUIZZES",
      "MANAGE_RESULTS",
      "MANAGE_LEVEL_UP_REQUESTS",
    ],
  },
];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionKind, string> = {
  MANAGE_COURSES: "Khóa học độc quyền",
  MANAGE_LESSONS_QUIZZES: "Bài học & bài test",
  MANAGE_LIBRARY: "Thư viện",
  MANAGE_STUDENTS: "Thành viên (xem danh sách & tạo mới)",
  EDIT_STUDENTS: "Sửa thành viên",
  LOCK_STUDENTS: "Khóa thành viên",
  DELETE_STUDENTS: "Xóa thành viên",
  MANAGE_CHAT: "Chat & hỗ trợ",
  MANAGE_LEVEL_UP_REQUESTS: "Yêu cầu lên cấp",
  MANAGE_RESULTS: "Kết quả bài test",
  MANAGE_ANNOUNCEMENTS: "Bản tin",
  MANAGE_ORDERS: "Đơn hàng",
  // Gates both /admin/revenue (đọc doanh thu, không sửa được gì) và
  // /admin/finance (đọc + ghi sổ thu chi — thêm/xoá tiền thật) — một
  // permission cho cả xem lẫn ghi, theo lựa chọn "gộp chung" thay vì tách
  // MANAGE_FINANCE_ENTRIES riêng. Tách ra sau này chỉ cần thêm 1 giá trị enum
  // mới, không đụng dữ liệu đã có.
  MANAGE_FINANCE: "Doanh thu & thu chi",
  MANAGE_PRODUCTS: "Sản phẩm",
  MANAGE_GROUPS: "Nhóm (cấu trúc, thành viên, trưởng/phó nhóm)",
  MANAGE_TESTS: "Kết quả trắc nghiệm",
  MANAGE_MINIGAME: "Mini-game & thưởng",
  MANAGE_VENDORS: "Nhà bán hàng (marketplace)",
};

// Every AdminPermissionKind value, derived from ADMIN_PERMISSION_LABELS
// (a Record<AdminPermissionKind, string>, so TS enforces it stays exhaustive
// as the enum grows) rather than hand-maintained — this is what an Admin
// Manager's or SUPER_ADMIN's "effective permissions" resolve to in
// setAccountPermissionsAction, since both hold every permission that exists.
export const ALL_ADMIN_PERMISSIONS = Object.keys(ADMIN_PERMISSION_LABELS) as AdminPermissionKind[];
