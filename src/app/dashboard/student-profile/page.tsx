import { requireActiveStudent } from "@/lib/access";
import { toDateOnlyISOString } from "@/lib/date";
import { LEVEL_LABELS } from "@/lib/levels";
import { ProfileForm } from "../profile/profile-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

// "Hồ sơ học sinh" — cùng nội dung với "Thông tin cá nhân"
// (src/app/dashboard/profile/page.tsx), chỉ khác nhãn/tiêu đề, theo yêu cầu
// tách trang học sinh khỏi trang học viên.
export default async function StudentProfilePage() {
  const student = await requireActiveStudent();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="Hồ sơ học sinh"
        description="Xem thông tin tài khoản và cập nhật họ tên, ngày sinh, số điện thoại của bạn."
      />

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
        <ProfileForm
          name={student.name}
          email={student.email}
          username={student.username}
          dateOfBirth={student.dateOfBirth ? toDateOnlyISOString(student.dateOfBirth) : null}
          phoneNumber={student.phoneNumber}
          grantedLevelLabel={student.grantedLevel ? LEVEL_LABELS[student.grantedLevel] : "Học sinh"}
        />
      </Card>
    </div>
  );
}
