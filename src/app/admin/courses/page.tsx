import Link from "next/link";
import { Plus, ArrowUpDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { CourseList, type AdminCourseItem } from "./course-list";
import { PageHeader } from "@/components/ui/page-header";
import { ReorderModal } from "@/components/ui/reorder-modal";
import { reorderCoursesAction } from "./actions";

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

export default async function CoursesPage() {
  await requireAdminPermission("MANAGE_COURSES");
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { lessons: true } },
      // grantedById: null = system-granted via a paid order, non-null = an
      // admin granted it by hand — split into two badges below instead of
      // one combined count (see order-fulfillment.ts for the convention).
      grants: { select: { grantedById: true } },
      levelGrants: { select: { minLevel: true }, orderBy: { minLevel: "asc" } },
      lessons: { where: { visibleToGuest: true }, select: { id: true } },
    },
  });

  const items: AdminCourseItem[] = courses.map((course, index) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    coverImageUrl: course.coverImageUrl,
    lessonsCount: course._count.lessons,
    manualGrantsCount: course.grants.filter((g) => g.grantedById !== null).length,
    purchasedGrantsCount: course.grants.filter((g) => g.grantedById === null).length,
    levelGrants: course.levelGrants.map((lg) => lg.minLevel),
    hiddenFromGuest: course.hiddenFromGuest,
    guestTrialLessonsCount: course.lessons.length,
    isFree: course.isFree,
    gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khóa học độc quyền"
        actions={
          <>
            <ReorderModal
              triggerLabel={
                <>
                  <ArrowUpDown className="h-4 w-4" />
                  Sắp xếp thứ tự
                </>
              }
              triggerClassName="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              title="Sắp xếp khóa học"
              items={items.map((c) => ({ id: c.id, label: c.title }))}
              onSave={reorderCoursesAction}
            />
            <Link
              href="/admin/courses/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Thêm khóa học
            </Link>
          </>
        }
      />

      <CourseList courses={items} />
    </div>
  );
}
