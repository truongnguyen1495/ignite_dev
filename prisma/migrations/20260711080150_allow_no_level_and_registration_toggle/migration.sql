-- AlterTable
ALTER TABLE "LevelUpRequest" ALTER COLUMN "fromLevel" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "registrationEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "grantedLevel" DROP NOT NULL,
ALTER COLUMN "grantedLevel" DROP DEFAULT;
