-- Replace the five-tier level ladder with the six-tier one.
--
-- CUSTOMER exists in BOTH ladders but at a DIFFERENT rank — Cấp 1 before,
-- Cấp 3 now. So this cannot be a rename in place: letting Postgres cast the
-- old value straight across (`"grantedLevel"::text::"Level_new"`, what Prisma
-- generates by default) would silently promote every Cấp 1 account two tiers
-- and hand 15 members course/library content they were never granted. Every
-- value is therefore mapped explicitly, rank for rank:
--
--   CUSTOMER    (Cấp 1) -> REGISTERED_MEMBER (Cấp 1)
--   NEW_STARTER (Cấp 2) -> IGNITE_MEMBER     (Cấp 2)
--   JUNIOR      (Cấp 3) -> CUSTOMER          (Cấp 3)
--   SENIOR      (Cấp 4) -> BUSINESS_BUILDER  (Cấp 4)
--   CORE_LEADER (Cấp 5) -> TEAM_PARTNER      (Cấp 5)
--
-- Nobody changes rank, so every existing access rule keeps resolving exactly
-- as it did. VISITOR (Cấp 0) is new and starts out unused.
--
-- The CASE is evaluated against each row's ORIGINAL value, which is what
-- makes JUNIOR -> CUSTOMER safe to run alongside CUSTOMER -> REGISTERED_MEMBER
-- in the same statement.

CREATE TYPE "Level_new" AS ENUM (
  'VISITOR',
  'REGISTERED_MEMBER',
  'IGNITE_MEMBER',
  'CUSTOMER',
  'BUSINESS_BUILDER',
  'TEAM_PARTNER'
);

ALTER TABLE "User" ALTER COLUMN "grantedLevel" TYPE "Level_new" USING (
  CASE "grantedLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

ALTER TABLE "Lesson" ALTER COLUMN "level" TYPE "Level_new" USING (
  CASE "level"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

ALTER TABLE "LevelUpRequest" ALTER COLUMN "fromLevel" TYPE "Level_new" USING (
  CASE "fromLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

ALTER TABLE "LevelUpRequest" ALTER COLUMN "toLevel" TYPE "Level_new" USING (
  CASE "toLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

ALTER TABLE "CourseLevelGrant" ALTER COLUMN "minLevel" TYPE "Level_new" USING (
  CASE "minLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

ALTER TABLE "ProductLevelGrant" ALTER COLUMN "minLevel" TYPE "Level_new" USING (
  CASE "minLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

ALTER TABLE "LibraryLevelGrant" ALTER COLUMN "minLevel" TYPE "Level_new" USING (
  CASE "minLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

-- Nullable below: a NULL matches no WHEN and there is no ELSE, so CASE
-- yields NULL and the column keeps its "no level rule" meaning.
ALTER TABLE "Announcement" ALTER COLUMN "minLevel" TYPE "Level_new" USING (
  CASE "minLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

ALTER TABLE "ChatThread" ALTER COLUMN "groupLevel" TYPE "Level_new" USING (
  CASE "groupLevel"::text
    WHEN 'CUSTOMER'    THEN 'REGISTERED_MEMBER'
    WHEN 'NEW_STARTER' THEN 'IGNITE_MEMBER'
    WHEN 'JUNIOR'      THEN 'CUSTOMER'
    WHEN 'SENIOR'      THEN 'BUSINESS_BUILDER'
    WHEN 'CORE_LEADER' THEN 'TEAM_PARTNER'
  END
)::"Level_new";

DROP TYPE "Level";

ALTER TYPE "Level_new" RENAME TO "Level";
