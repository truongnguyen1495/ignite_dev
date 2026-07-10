-- AlterTable
-- dateOfBirth has no time-of-day/timezone meaning, so store it as a plain
-- calendar date rather than a timestamp. TIMESTAMP -> DATE is an implicit
-- cast in Postgres and simply drops the (always-midnight) time component.
ALTER TABLE "User" ALTER COLUMN "dateOfBirth" TYPE DATE;
