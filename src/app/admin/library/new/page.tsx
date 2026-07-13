import { requireAdminPermission, isSalesEnabled } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CreateLibraryItemForm } from "./create-library-item-form";

export default async function NewLibraryItemPage() {
  await requireAdminPermission("MANAGE_LIBRARY");
  const salesEnabled = await isSalesEnabled();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <BackLink href="/admin/library">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm sách / tài liệu</h1>
      </div>
      <Card>
        <CreateLibraryItemForm salesEnabled={salesEnabled} />
      </Card>
    </div>
  );
}
