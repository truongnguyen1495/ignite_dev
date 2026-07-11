import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { CourseList, type AdminCourseItem } from "./course-list";
import { PageHeader } from "@/components/ui/page-header";

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
      _count: { select: { lessons: true, grants: true } },
      levelGrants: { select: { minLevel: true }, orderBy: { minLevel: "asc" } },
    },
  });

  const items: AdminCourseItem[] = courses.map((course, index) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    coverImageUrl: course.coverImageUrl,
    lessonsCount: course._count.lessons,
    grantsCount: course._count.grants,
    levelGrants: course.levelGrants.map((lg) => lg.minLevel),
    visibleToGuest: course.visibleToGuest,
    gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khóa học độc quyền"
        actions={
          <Link
            href="/admin/courses/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm khóa học
          </Link>
        }
      />

      <CourseList courses={items} />
    </div>
  );
}
