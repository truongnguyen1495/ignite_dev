import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, hasAdminPermission, isSalesEnabled } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import { EditLibraryItemForm } from "./edit-library-item-form";
import { LibraryItemGuestAccessForm } from "./library-item-guest-access-form";
import { DeleteLibraryItemButton } from "./delete-library-item-button";
import {
  RevokeAccessButton,
  GrantAccessForm,
  GrantLevelAccessForm,
  RevokeLevelAccessButton,
} from "./access-grants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function EditLibraryItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const admin = await requireAdminPermission("MANAGE_LIBRARY");
  const { itemId } = await params;
  const salesEnabled = await isSalesEnabled();
  const canManageOrders = await hasAdminPermission(admin, "MANAGE_ORDERS");

  const item = await prisma.libraryItem.findUnique({
    where: { id: itemId },
    include: {
      grants: {
        include: { student: true, orderItem: { include: { order: true } } },
        orderBy: { grantedAt: "desc" },
      },
      levelGrants: { orderBy: { minLevel: "asc" } },
    },
  });
  if (!item) {
    notFound();
  }

  const grantedStudentIds = new Set(item.grants.map((g) => g.studentId));
  const ungrantedStudents = await prisma.user.findMany({
    where: { role: "STUDENT", adminOnly: false, id: { notIn: [...grantedStudentIds] } },
    orderBy: { name: "asc" },
  });

  // Passed to RevokeAccessButton so its confirm dialog can name the actual
  // order instead of a generic warning — null for admin-granted rows.
  function orderInfoFor(grant: NonNullable<typeof item>["grants"][number]) {
    if (!grant.orderItem) return null;
    return {
      orderNumber: grant.orderItem.order.orderNumber,
      amountLabel: formatVND(grant.orderItem.priceAtPurchase),
      paidAtLabel: grant.orderItem.order.paidAt ? formatDateVN(grant.orderItem.order.paidAt) : "",
    };
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <EditLibraryItemForm
        libraryItemId={item.id}
        title={item.title}
        author={item.author}
        description={item.description}
        type={item.type}
        format={item.format}
        coverImageUrl={item.coverImageUrl}
        filePath={item.filePath}
        pageCount={item.pageCount}
        price={item.price}
        salePrice={item.salePrice}
        isFree={item.isFree}
        salesEnabled={salesEnabled}
        canManageOrders={canManageOrders}
      />

      <LibraryItemGuestAccessForm
        libraryItemId={item.id}
        filePath={item.filePath}
        pageCount={item.pageCount}
        guestPreviewPages={item.guestPreviewPages}
        visibleToGuest={item.visibleToGuest}
        featuredOnHome={item.featuredOnHome}
        isFree={item.isFree}
      />

      {item.isFree && (
        <Card padding="lg" className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Mục này đang miễn phí</h2>
          <p className="text-xs text-muted">
            Mọi thành viên (kể cả đăng ký sau này) tự động có toàn quyền xem, nên các phần cấp quyền riêng bên
            dưới đang tạm ẩn. Bỏ tick &ldquo;Miễn phí&rdquo; ở form phía trên để dùng lại.
          </p>
        </Card>
      )}

      {!item.isFree && (
      <>
      <Card padding="lg" className="space-y-5">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Thành viên được cấp quyền ({item.grants.length})
          </h2>
          {item.grants.length === 0 ? (
            <p className="text-sm text-muted">Chưa cấp quyền cho thành viên nào.</p>
          ) : (
            <ul className="space-y-2">
              {item.grants.map((grant) => (
                <li
                  key={grant.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
                >
                  <div>
                    <p className="flex items-center gap-1.5 text-foreground">
                      {grant.student.name}
                      {grant.orderItem && <Badge color="info">Đã mua</Badge>}
                    </p>
                    <p className="text-muted">{grant.student.email}</p>
                  </div>
                  <RevokeAccessButton
                    grantId={grant.id}
                    libraryItemId={item.id}
                    studentName={grant.student.name}
                    orderInfo={orderInfoFor(grant)}
                  />
                </li>
              ))}
            </ul>
          )}

          {ungrantedStudents.length > 0 && (
            <GrantAccessForm libraryItemId={item.id} students={ungrantedStudents} />
          )}
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Cấp quyền theo cấp</h2>
          <p className="text-xs text-muted">
            Thành viên đủ cấp — kể cả lên cấp sau này — sẽ tự động xem được mục này, không cần cấp lại thủ công.
          </p>
          {item.levelGrants.length === 0 ? (
            <p className="text-sm text-muted">Chưa có luật cấp nào.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {item.levelGrants.map((levelGrant) => (
                <li
                  key={levelGrant.id}
                  className="flex items-center gap-1.5 rounded-full bg-primary-bg py-1 pl-3 pr-1.5 text-sm text-primary"
                >
                  {LEVEL_LABELS[levelGrant.minLevel]} trở lên
                  <RevokeLevelAccessButton grantId={levelGrant.id} libraryItemId={item.id} />
                </li>
              ))}
            </ul>
          )}
          <GrantLevelAccessForm libraryItemId={item.id} />
        </div>
      </Card>
      </>
      )}

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteLibraryItemButton libraryItemId={item.id} libraryItemTitle={item.title} />
      </Card>
    </div>
  );
}
