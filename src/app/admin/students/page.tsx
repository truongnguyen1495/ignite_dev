import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, getAdminPermissions, hasFullAdminAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { PendingJoinRequests } from "./pending-join-requests";
import { StudentsTable, type StudentRow } from "./students-table";

export default async function StudentsPage() {
  const admin = await requireAdminPermission("MANAGE_STUDENTS");
  // Editing/locking/deleting/demoting a học viên each need their own
  // permission — stricter than the base MANAGE_STUDENTS gate on this page
  // itself (which only covers viewing the list + creating new accounts), so
  // a limited admin may see this list without being able to do any of them.
  // Computed once here to decide which action buttons each row renders.
  const isFullAdmin = hasFullAdminAccess(admin);
  const isSuperAdmin = admin.role === "SUPER_ADMIN";
  const granted = isFullAdmin ? null : await getAdminPermissions(admin.id);
  const canLock = isFullAdmin || !!granted?.has("LOCK_STUDENTS");
  const canDelete = isFullAdmin || !!granted?.has("DELETE_STUDENTS");
  const canDemote = isFullAdmin || !!granted?.has("DEMOTE_STUDENTS");
  // "Học sinh" (grantedLevel null) are a fully separate flow with their own
  // page and permission — see /admin/prospective-students. Their pending
  // "tham gia hệ thống đào tạo 5 cấp" requests are reviewed here instead,
  // since approving one admits them into this Học viên roster.
  const [students, pendingRequests, approvedJoinRequests] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        adminOnly: false,
        grantedLevel: { not: null },
        // A non-Super-Admin (even a full-access Admin Manager) must not
        // even see another Admin Manager here — same boundary as
        // admin/admins/page.tsx and the mutation actions in ./actions.ts.
        ...(isSuperAdmin ? {} : { isAdminManager: false }),
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.levelUpRequest.findMany({
      where: { fromLevel: null, status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { student: true },
    }),
    // "Ngày tham gia hệ thống 5 cấp" — when a join request got approved, not
    // account creation date, since a học viên may have registered as a học
    // sinh long before being admitted. Falls back to createdAt below for a
    // học viên an admin created directly (no join request ever existed).
    prisma.levelUpRequest.findMany({
      where: { fromLevel: null, status: "APPROVED" },
      orderBy: { reviewedAt: "desc" },
      select: { studentId: true, reviewedAt: true },
    }),
  ]);
  const joinedAtByStudent = new Map<string, Date>();
  for (const req of approvedJoinRequests) {
    if (!joinedAtByStudent.has(req.studentId) && req.reviewedAt) {
      joinedAtByStudent.set(req.studentId, req.reviewedAt);
    }
  }
  const studentRows: StudentRow[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    username: s.username,
    grantedLevel: s.grantedLevel!,
    status: s.status,
    joinedAt: joinedAtByStudent.get(s.id) ?? s.createdAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Danh sách Học viên (${students.length})`}
        actions={
          <Link
            href="/admin/students/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm Học viên Mới
          </Link>
        }
      />

      <PendingJoinRequests requests={pendingRequests} />

      {students.length === 0 ? (
        <p className="text-sm text-muted">Chưa có học viên nào.</p>
      ) : (
        <StudentsTable students={studentRows} canLock={canLock} canDelete={canDelete} canDemote={canDemote} />
      )}
    </div>
  );
}
