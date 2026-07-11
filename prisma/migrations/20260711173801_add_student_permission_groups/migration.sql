-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminPermissionKind" ADD VALUE 'EDIT_STUDENTS';
ALTER TYPE "AdminPermissionKind" ADD VALUE 'LOCK_STUDENTS';
ALTER TYPE "AdminPermissionKind" ADD VALUE 'DELETE_STUDENTS';
ALTER TYPE "AdminPermissionKind" ADD VALUE 'EDIT_PROSPECTIVE_STUDENTS';
ALTER TYPE "AdminPermissionKind" ADD VALUE 'LOCK_PROSPECTIVE_STUDENTS';
ALTER TYPE "AdminPermissionKind" ADD VALUE 'DELETE_PROSPECTIVE_STUDENTS';
