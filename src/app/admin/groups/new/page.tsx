import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { requireAdminPermission } from "@/lib/access";
import { CreateGroupForm } from "./create-group-form";

export default async function NewGroupPage() {
  await requireAdminPermission("MANAGE_GROUPS");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <BackLink href="/admin/groups">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Tạo nhóm mới</h1>
      </div>
      <Card padding="lg">
        <CreateGroupForm />
      </Card>
    </div>
  );
}
