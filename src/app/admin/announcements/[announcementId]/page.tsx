import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { EditAnnouncementForm } from "./edit-announcement-form";
import { DeleteAnnouncementButton } from "./delete-announcement-button";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href="/admin/announcements">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{announcement.title}</h1>
      </div>

      <Card padding="lg">
        <EditAnnouncementForm
          announcementId={announcement.id}
          title={announcement.title}
          content={announcement.content}
          coverImageUrl={announcement.coverImageUrl}
          category={announcement.category}
          minLevel={announcement.minLevel}
          visibleToGuest={announcement.visibleToGuest}
          visibleToStudents={announcement.visibleToStudents}
        />
      </Card>

      <Card padding="lg" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
        <DeleteAnnouncementButton announcementId={announcement.id} announcementTitle={announcement.title} />
      </Card>
    </div>
  );
}
