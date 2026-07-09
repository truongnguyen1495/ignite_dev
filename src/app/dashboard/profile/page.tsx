import { requireActiveStudent } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { PhoneNumberForm } from "./phone-number-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function ProfilePage() {
  const student = await requireActiveStudent();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="Thông tin cá nhân"
        description="Xem thông tin tài khoản và cập nhật số điện thoại của bạn."
      />

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Họ và tên</dt>
            <dd className="text-foreground">{student.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Email</dt>
            <dd className="text-foreground">{student.email}</dd>
          </div>
          {student.username && (
            <div>
              <dt className="text-xs text-muted">Username</dt>
              <dd className="text-foreground">@{student.username}</dd>
            </div>
          )}
          {student.dateOfBirth && (
            <div>
              <dt className="text-xs text-muted">Ngày sinh</dt>
              <dd className="text-foreground">{student.dateOfBirth.toLocaleDateString("vi-VN")}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted">Cấp được cấp quyền</dt>
            <dd className="text-foreground">{LEVEL_LABELS[student.grantedLevel]}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Số điện thoại</h2>
        <PhoneNumberForm currentPhoneNumber={student.phoneNumber} />
      </Card>
    </div>
  );
}
