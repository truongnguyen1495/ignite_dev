import { requireAdminPermission } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CreateProductForm } from "./create-product-form";

export default async function NewProductPage() {
  const user = await requireAdminPermission("MANAGE_PRODUCTS");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <BackLink href="/admin/products">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Thêm sản phẩm</h1>
      </div>
      <Card>
        <CreateProductForm isSuperAdmin={user.role === "SUPER_ADMIN"} />
      </Card>
    </div>
  );
}
