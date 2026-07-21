import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, hasAdminPermission, isSalesEnabled } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { EditLibraryItemForm } from "./edit-library-item-form";
import { LibraryItemGuestAccessForm } from "./library-item-guest-access-form";
import { DeleteLibraryItemButton } from "./delete-library-item-button";
import {
  RevokeAccessButton,
  GrantAccessForm,
  GrantLevelAccessForm,
  RevokeLevelAccessButton,
  ToggleOpenToProspectiveStudents,
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
      grants: { include: { student: true }, orderBy: { grantedAt: "desc" } },
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

  // Same "Học sinh" (chưa xếp cấp) vs "Học viên" (đã xếp cấp) split as the
  // course edit page — two independent lists/pickers, see
  // ToggleOpenToProspectiveStudents below for the "grant to all học sinh at
  // once" continuous rule.
  const hocVienGrants = item.grants.filter((g) => g.student.grantedLevel !== null);
  const hocSinhGrants = item.grants.filter((g) => g.student.grantedLevel === null);
  const ungrantedHocVien = ungrantedStudents.filter((s) => s.grantedLevel !== null);
  const ungrantedHocSinh = ungrantedStudents.filter((s) => s.grantedLevel === null);

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
        backgroundImageUrl={item.backgroundImageUrl}
        filePath={item.filePath}
        pageCount={item.pageCount}
        order={item.order}
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
      />

      {item.isFree && (
        <Card padding="lg" className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Mục này đang miễn phí</h2>
          <p className="text-xs text-muted">
            Mọi học viên &amp; học sinh (kể cả đăng ký sau này) tự động có toàn quyền xem, nên các phần cấp
            quyền riêng bên dưới đang tạm ẩn. Bỏ tick &ldquo;Miễn phí&rdquo; ở form phía trên để dùng lại.
          </p>
        </Card>
      )}

      {!item.isFree && (
      <>
      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Học sinh được cấp quyền ({hocSinhGrants.length})
        </h2>
        <p className="text-xs text-muted">
          Học sinh (tài khoản chưa xếp cấp) không thuộc thang 5 cấp nên không dùng được luật &ldquo;Cấp quyền
          theo cấp&rdquo; ở dưới — dùng công tắc bên dưới để mở cho tất cả, hoặc cấp riêng từng người.
        </p>
        <ToggleOpenToProspectiveStudents libraryItemId={item.id} open={item.openToProspectiveStudents} />
        {hocSinhGrants.length === 0 ? (
          <p className="text-sm text-muted">Chưa cấp quyền riêng cho học sinh nào.</p>
        ) : (
          <ul className="space-y-2">
            {hocSinhGrants.map((grant) => (
              <li
                key={grant.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-foreground">
                    {grant.student.name}
                    {grant.grantedById === null && <Badge color="info">Đã mua</Badge>}
                  </p>
                  <p className="text-muted">{grant.student.email}</p>
                </div>
                <RevokeAccessButton grantId={grant.id} libraryItemId={item.id} />
              </li>
            ))}
          </ul>
        )}

        {ungrantedHocSinh.length > 0 && (
          <GrantAccessForm
            libraryItemId={item.id}
            students={ungrantedHocSinh}
            placeholder="Chọn học sinh..."
            submitLabel="Cấp quyền"
          />
        )}
      </Card>

      <Card padding="lg" className="space-y-5">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Học viên được cấp quyền ({hocVienGrants.length})
          </h2>
          {hocVienGrants.length === 0 ? (
            <p className="text-sm text-muted">Chưa cấp quyền cho học viên nào.</p>
          ) : (
            <ul className="space-y-2">
              {hocVienGrants.map((grant) => (
                <li
                  key={grant.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm"
                >
                  <div>
                    <p className="text-foreground">{grant.student.name}</p>
                    <p className="text-muted">{grant.student.email}</p>
                  </div>
                  <RevokeAccessButton grantId={grant.id} libraryItemId={item.id} />
                </li>
              ))}
            </ul>
          )}

          {ungrantedHocVien.length > 0 && (
            <GrantAccessForm libraryItemId={item.id} students={ungrantedHocVien} />
          )}
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Cấp quyền theo cấp</h2>
          <p className="text-xs text-muted">
            Học viên đủ cấp — kể cả lên cấp sau này — sẽ tự động xem được mục này, không cần cấp lại thủ công.
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
