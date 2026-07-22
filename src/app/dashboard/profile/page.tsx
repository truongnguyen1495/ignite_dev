import { requireActiveStudent } from "@/lib/access";
import { toDateOnlyISOString } from "@/lib/date";
import { LEVEL_LABELS } from "@/lib/levels";
import { ProfileForm } from "./profile-form";
import { SetPasswordForm } from "./set-password-form";
import { ChangePasswordForm } from "./change-password-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function ProfilePage() {
  const student = await requireActiveStudent();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="Thông tin cá nhân"
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

      {student.passwordHash ? (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-foreground">Đổi mật khẩu</h2>
          <ChangePasswordForm />
        </Card>
      ) : (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-foreground">Đặt mật khẩu</h2>
          <SetPasswordForm />
        </Card>
      )}
    </div>
  );
}
