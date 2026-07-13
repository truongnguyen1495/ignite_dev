-- Replace Course.visibleToGuest (a listing gate + prerequisite for
-- CourseLesson.visibleToGuest) with Course.hiddenFromGuest (a pure "hide the
-- whole course from guests" override). Data is inverted on migrate so the
-- existing guest-facing state is preserved: courses guests could already see
-- (visibleToGuest = true) stay visible (hiddenFromGuest = false), and courses
-- guests couldn't see become explicitly hidden (hiddenFromGuest = true).
ALTER TABLE "Course" ADD COLUMN "hiddenFromGuest" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Course" SET "hiddenFromGuest" = NOT "visibleToGuest";

ALTER TABLE "Course" DROP COLUMN "visibleToGuest";
