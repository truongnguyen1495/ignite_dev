-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canManageAdmins" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAdminManager" BOOLEAN NOT NULL DEFAULT false;
