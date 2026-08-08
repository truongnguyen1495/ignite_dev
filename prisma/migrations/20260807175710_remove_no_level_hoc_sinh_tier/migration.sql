-- Remove the "học sinh chưa xếp cấp" (grantedLevel = null) tier entirely.
-- Every User is now always on the 5-level ladder.

-- Data step 1: the one still-PENDING "xin tham gia" join request gets
-- auto-approved as part of retiring manual review for this tier (matches
-- the new instant-CUSTOMER behavior on /register and Google sign-in).
UPDATE "LevelUpRequest"
SET "status" = 'APPROVED',
    "reviewedAt" = now(),
    "reviewerNote" = 'Tự động duyệt do bỏ tier "học sinh chưa xếp cấp"'
WHERE "status" = 'PENDING' AND "fromLevel" IS NULL;

-- Data step 2: drop AdminPermission rows for the 5 permission kinds being
-- removed from the enum below — must happen before the enum swap, since
-- the type-cast used to migrate the column would otherwise fail on these
-- now-invalid values.
DELETE FROM "AdminPermission"
WHERE "permission" IN (
  'MANAGE_PROSPECTIVE_STUDENTS',
  'DEMOTE_STUDENTS',
  'EDIT_PROSPECTIVE_STUDENTS',
  'LOCK_PROSPECTIVE_STUDENTS',
  'DELETE_PROSPECTIVE_STUDENTS'
);

-- AlterEnum
BEGIN;
CREATE TYPE "AdminPermissionKind_new" AS ENUM ('MANAGE_COURSES', 'MANAGE_LESSONS_QUIZZES', 'MANAGE_LIBRARY', 'MANAGE_STUDENTS', 'MANAGE_CHAT', 'MANAGE_LEVEL_UP_REQUESTS', 'MANAGE_RESULTS', 'MANAGE_ANNOUNCEMENTS', 'EDIT_STUDENTS', 'LOCK_STUDENTS', 'DELETE_STUDENTS', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS');
ALTER TABLE "AdminPermission" ALTER COLUMN "permission" TYPE "AdminPermissionKind_new" USING ("permission"::text::"AdminPermissionKind_new");
ALTER TYPE "AdminPermissionKind" RENAME TO "AdminPermissionKind_old";
ALTER TYPE "AdminPermissionKind_new" RENAME TO "AdminPermissionKind";
DROP TYPE "public"."AdminPermissionKind_old";
COMMIT;

-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "visibleToProspective";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "openToProspectiveStudents";

-- Data step 3: backfill every remaining null fromLevel (historical, already
-- resolved join requests, including the one just approved above) to
-- CUSTOMER — a placeholder for "joined from nothing", not a real prior
-- level, kept only so the audit trail stays intact.
UPDATE "LevelUpRequest" SET "fromLevel" = 'CUSTOMER' WHERE "fromLevel" IS NULL;

-- AlterTable
ALTER TABLE "LevelUpRequest" ALTER COLUMN "fromLevel" SET NOT NULL;

-- AlterTable
ALTER TABLE "LibraryItem" DROP COLUMN "openToProspectiveStudents";

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "enforceLessonWatchForHocSinh";

-- Data step 4: backfill the 2 real self-registered accounts still on
-- "chưa xếp cấp" straight to CUSTOMER (Cấp 1) — consistent with the new
-- policy that self-registration and Google sign-in grant CUSTOMER instantly.
UPDATE "User" SET "grantedLevel" = 'CUSTOMER' WHERE "grantedLevel" IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "grantedLevel" SET NOT NULL;
