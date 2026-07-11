-- Remove the PENDING value from AccountStatus (the pending-registration
-- approval feature was retired; self-registration now activates accounts
-- instantly). No row currently has this value, confirmed before writing
-- this migration. Postgres has no direct "DROP VALUE" for enums, so this
-- recreates the type without it.
BEGIN;

CREATE TYPE "AccountStatus_new" AS ENUM ('ACTIVE', 'LOCKED');

ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "AccountStatus_new" USING ("status"::text::"AccountStatus_new");
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TYPE "AccountStatus" RENAME TO "AccountStatus_old";
ALTER TYPE "AccountStatus_new" RENAME TO "AccountStatus";
DROP TYPE "AccountStatus_old";

COMMIT;
