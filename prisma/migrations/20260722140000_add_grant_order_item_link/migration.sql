-- Link CourseAccessGrant/LibraryAccessGrant to the OrderItem that created
-- them (when they came from a paid order), instead of relying on
-- grantedById's nullability to infer "was this bought" — see the schema
-- comments on these two columns.
ALTER TABLE "CourseAccessGrant" ADD COLUMN "orderItemId" TEXT;
ALTER TABLE "LibraryAccessGrant" ADD COLUMN "orderItemId" TEXT;

CREATE UNIQUE INDEX "CourseAccessGrant_orderItemId_key" ON "CourseAccessGrant"("orderItemId");
CREATE UNIQUE INDEX "LibraryAccessGrant_orderItemId_key" ON "LibraryAccessGrant"("orderItemId");

ALTER TABLE "CourseAccessGrant" ADD CONSTRAINT "CourseAccessGrant_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryAccessGrant" ADD CONSTRAINT "LibraryAccessGrant_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing order-created grant (grantedById IS NULL) is
-- matched to its most recently paid matching OrderItem. Picking the most
-- recent one is correct even if a student bought, got revoked, and bought
-- the same course/item again — the current grant row reflects the latest
-- purchase.
UPDATE "CourseAccessGrant" cag
SET "orderItemId" = sub.id
FROM (
  SELECT DISTINCT ON (o."studentId", oi."courseId") oi.id, o."studentId", oi."courseId", o."paidAt"
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE oi.kind = 'COURSE' AND o.status = 'PAID'
  ORDER BY o."studentId", oi."courseId", o."paidAt" DESC
) sub
WHERE cag."grantedById" IS NULL
  AND cag."studentId" = sub."studentId"
  AND cag."courseId" = sub."courseId";

UPDATE "LibraryAccessGrant" lag
SET "orderItemId" = sub.id
FROM (
  SELECT DISTINCT ON (o."studentId", oi."libraryItemId") oi.id, o."studentId", oi."libraryItemId", o."paidAt"
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE oi.kind = 'LIBRARY_ITEM' AND o.status = 'PAID'
  ORDER BY o."studentId", oi."libraryItemId", o."paidAt" DESC
) sub
WHERE lag."grantedById" IS NULL
  AND lag."studentId" = sub."studentId"
  AND lag."libraryItemId" = sub."libraryItemId";
