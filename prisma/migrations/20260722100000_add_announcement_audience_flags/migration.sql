-- Split the old single minLevel-based audience into three independent
-- per-audience flags. Existing rows are backfilled to preserve their exact
-- prior effective visibility:
--   * minLevel IS NULL used to mean "everyone, học sinh included"
--     -> visibleToProspective = true
--   * minLevel set OR NULL, học viên always had at least some access
--     (either everyone when NULL, or a subset from that level up)
--     -> visibleToLeveled = true for every existing row
ALTER TABLE "Announcement" ADD COLUMN "visibleToProspective" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN "visibleToLeveled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Announcement" SET "visibleToProspective" = ("minLevel" IS NULL);
UPDATE "Announcement" SET "visibleToLeveled" = true;
