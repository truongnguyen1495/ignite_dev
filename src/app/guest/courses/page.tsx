import { getGuestCourseItems } from "@/lib/guest-courses";
import { GuestCourseList } from "./course-list";

// No dynamic API (searchParams/cookies/headers) is read on this page, so
// without this Next.js treats it as static and prerenders it once at build
// time — admins toggling visibleToGuest afterward would never show up here.
export const dynamic = "force-dynamic";

export default async function GuestCoursesPage() {
  const items = await getGuestCourseItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Khóa học độc quyền</h1>
      </div>

      <GuestCourseList courses={items} />
    </div>
  );
}
