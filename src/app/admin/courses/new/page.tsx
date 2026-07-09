import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CreateCourseForm } from "./create-course-form";

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <BackLink href="/admin/courses">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm khóa học</h1>
      </div>
      <Card>
        <CreateCourseForm />
      </Card>
    </div>
  );
}
