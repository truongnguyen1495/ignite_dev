import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { EditProductForm } from "./edit-product-form";
import { DeleteProductButton } from "./delete-product-button";
import { ProductGuestAccessForm } from "./product-guest-access-form";
import {
  GrantProductAccessForm,
  RevokeProductAccessButton,
  GrantProductLevelAccessForm,
  RevokeProductLevelAccessButton,
} from "./product-access-grants";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireAdminPermission("MANAGE_PRODUCTS");
  const { productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      accessGrants: { include: { student: true }, orderBy: { grantedAt: "desc" } },
      levelGrants: { orderBy: { minLevel: "asc" } },
    },
  });
  if (!product) {
    notFound();
  }

  const grantedStudentIds = new Set(product.accessGrants.map((g) => g.studentId));
  const ungrantedStudents = await prisma.user.findMany({
    where: { role: "STUDENT", adminOnly: false, id: { notIn: [...grantedStudentIds] } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <BackLink href="/admin/products">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{product.title}</h1>
      </div>

      <Card padding="lg">
        <EditProductForm
          productId={product.id}
          title={product.title}
          subtitle={product.subtitle}
          description={product.description}
          badgeLabel={product.badgeLabel}
          imageUrl={product.imageUrl}
          order={product.order}
          price={product.price}
          salePrice={product.salePrice}
          cv={product.cv}
          slug={product.slug}
          lifestyleImage1Url={product.lifestyleImage1Url}
          lifestyleImage2Url={product.lifestyleImage2Url}
          lifestyleImage3Url={product.lifestyleImage3Url}
          isSuperAdmin={user.role === "SUPER_ADMIN"}
        />
      </Card>

      <Card padding="lg" className="space-y-5">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Cấp quyền hiển thị</h2>
          <p className="text-xs text-muted">
            Kiểm soát ai được xem trang sản phẩm này — trên trang khách, trang học viên và link
            chi tiết.
          </p>
          <ProductGuestAccessForm productId={product.id} hiddenFromGuest={product.hiddenFromGuest} />
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Cấp quyền theo cấp</h2>
          <p className="text-xs text-muted">
            Học viên đủ cấp — kể cả lên cấp sau này — sẽ tự động xem được sản phẩm này, không cần
            cấp lại thủ công.
          </p>
          {product.levelGrants.length === 0 ? (
            <p className="text-sm text-muted">Chưa có luật cấp nào.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {product.levelGrants.map((levelGrant) => (
                <li
                  key={levelGrant.id}
                  className="flex items-center gap-1.5 rounded-full bg-primary-bg py-1 pl-3 pr-1.5 text-sm text-primary"
                >
                  {LEVEL_LABELS[levelGrant.minLevel]} trở lên
                  <RevokeProductLevelAccessButton grantId={levelGrant.id} productId={product.id} />
                </li>
              ))}
            </ul>
          )}
          <GrantProductLevelAccessForm productId={product.id} />
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Cấp quyền riêng cho từng học viên ({product.accessGrants.length})
          </h2>
          <p className="text-xs text-muted">
            Dành cho trường hợp ngoại lệ — một học viên chưa đủ cấp nhưng vẫn muốn cho xem trước.
          </p>
          {product.accessGrants.length === 0 ? (
            <p className="text-sm text-muted">Chưa cấp quyền riêng cho học viên nào.</p>
          ) : (
            <ul className="space-y-2">
              {product.accessGrants.map((grant) => (
                <li
                  key={grant.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
                >
                  <div>
                    <p className="text-foreground">{grant.student.name}</p>
                    <p className="text-muted">{grant.student.email}</p>
                  </div>
                  <RevokeProductAccessButton
                    grantId={grant.id}
                    productId={product.id}
                    studentName={grant.student.name}
                  />
                </li>
              ))}
            </ul>
          )}
          {ungrantedStudents.length > 0 && (
            <GrantProductAccessForm productId={product.id} students={ungrantedStudents} />
          )}
        </div>
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteProductButton productId={product.id} productTitle={product.title} />
      </Card>
    </div>
  );
}
