import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { User } from "@prisma/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getOverviewCourses } from "@/lib/overview";
import { CardHead, CoverThumb, EmptyState, OverviewCard, ProgressBar, plural } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];
type LevelsCopy = Dictionary["dashboardLevelsPage"];

export async function CoursesCard({
  student,
  copy,
  levelsCopy,
}: {
  student: User;
  copy: Copy;
  levelsCopy: LevelsCopy;
}) {
  const courses = await getOverviewCourses(student);

  return (
    <OverviewCard>
      <CardHead title={copy.coursesTitle} action={{ href: "/dashboard/courses", label: copy.coursesViewAll }} />

      {courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
          body={copy.coursesEmptyBody}
          action={{ href: "/dashboard/courses", label: copy.coursesEmptyAction }}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {courses.map((course, index) => (
            <li key={course.id} className="flex items-center gap-3">
              <CoverThumb url={course.coverImageUrl} alt="" tone={index} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm font-medium text-foreground">{course.title}</b>
                <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-muted">
                  {course.completedCount} / {course.totalLessons}{" "}
                  {plural(course.totalLessons, levelsCopy.lessonOne, levelsCopy.lessonMany)}
                </span>
                <div className="mt-1.5">
                  <ProgressBar percent={course.percent} tone={index % 2 === 1 ? "info" : "primary"} />
                </div>
              </div>
              <Link
                href={course.href}
                className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                {copy.actionContinue}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
