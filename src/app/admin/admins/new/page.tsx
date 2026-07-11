import { requireActiveSuperAdmin } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { NewAdminPicker } from "./new-admin-picker";

export default async function NewAdminPage() {
  await requireActiveSuperAdmin();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/admin/admins">Quay lại</BackLink>
        <div className="mt-2">
          <PageHeader
            title="Thêm admin"
            description="Tìm một tài khoản học viên có sẵn để cấp quyền, hoặc tạo tài khoản mới."
          />
        </div>
      </div>
      <NewAdminPicker />
    </div>
  );
}
