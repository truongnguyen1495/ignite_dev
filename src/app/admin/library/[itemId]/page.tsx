import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/levels";
import { EditLibraryItemForm } from "./edit-library-item-form";
import { DeleteLibraryItemButton } from "./delete-library-item-button";
import {
  RevokeAccessButton,
  GrantAccessForm,
  GrantLevelAccessForm,
  RevokeLevelAccessButton,
} from "./access-grants";
import { Card } from "@/components/ui/card";

export default async function EditLibraryItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

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
    where: { role: "STUDENT", id: { notIn: [...grantedStudentIds] } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <EditLibraryItemForm
        libraryItemId={item.id}
        title={item.title}
        author={item.author}
        description={item.description}
        type={item.type}
        coverImageUrl={item.coverImageUrl}
        filePath={item.filePath}
        pageCount={item.pageCount}
        guestPreviewPages={item.guestPreviewPages}
        order={item.order}
        visibleToGuest={item.visibleToGuest}
      />

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Học viên được cấp quyền ({item.grants.length})
        </h2>
        {item.grants.length === 0 ? (
          <p className="text-sm text-muted">Chưa cấp quyền cho học viên nào.</p>
        ) : (
          <ul className="space-y-2">
            {item.grants.map((grant) => (
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

        {ungrantedStudents.length > 0 && (
          <GrantAccessForm libraryItemId={item.id} students={ungrantedStudents} />
        )}
      </Card>

      <Card padding="lg" className="space-y-3">
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
                className="flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-sm text-primary"
              >
                {LEVEL_LABELS[levelGrant.minLevel]} trở lên
                <RevokeLevelAccessButton grantId={levelGrant.id} libraryItemId={item.id} />
              </li>
            ))}
          </ul>
        )}
        <GrantLevelAccessForm libraryItemId={item.id} />
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteLibraryItemButton libraryItemId={item.id} libraryItemTitle={item.title} />
      </Card>
    </div>
  );
}
