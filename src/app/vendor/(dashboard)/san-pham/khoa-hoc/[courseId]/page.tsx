import { notFound } from "next/navigation";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { EditVendorCourseForm } from "./edit-vendor-course-form";
import { DeleteVendorCourseButton } from "./delete-vendor-course-button";
import { VendorCourseOutline } from "./course-outline";

export default async function VendorCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { vendor } = await requireVendorAccountAccess();
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, sellerId: vendor.id },
    include: {
      chapters: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      lessons: { where: { chapterId: null }, orderBy: { order: "asc" } },
    },
  });
  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BackLink href="/vendor/san-pham">Sản phẩm của tôi</BackLink>
      <PageHeader title={course.title} description="Khóa học video — chương & bài giảng của riêng gian hàng bạn." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <EditVendorCourseForm
              courseId={course.id}
              title={course.title}
              description={course.description}
              coverImageUrl={course.coverImageUrl}
              price={course.price}
              salePrice={course.salePrice}
            />
          </div>
          {course.vendorHiddenAt && (
            <div className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
              <p className="font-medium">Admin đã ẩn khóa học này.</p>
              {course.vendorHiddenReason && <p className="mt-1">{course.vendorHiddenReason}</p>}
            </div>
          )}
          <div className="flex justify-end">
            <DeleteVendorCourseButton courseId={course.id} courseTitle={course.title} />
          </div>
        </div>

        <VendorCourseOutline
          courseId={course.id}
          chapters={course.chapters.map((c) => ({
            id: c.id,
            title: c.title,
            lessons: c.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              content: l.content,
              youtubeId: l.youtubeId,
              chapterId: l.chapterId,
            })),
          }))}
          unassignedLessons={course.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            content: l.content,
            youtubeId: l.youtubeId,
            chapterId: l.chapterId,
          }))}
        />
      </div>
    </div>
  );
}
