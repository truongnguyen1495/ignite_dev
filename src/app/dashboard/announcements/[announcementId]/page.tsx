import { requireAnnouncementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { formatDateVN } from "@/lib/date";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const { student, announcement } = await requireAnnouncementAccess(announcementId);

  // Marking as read is a side effect of viewing the page, not a separate
  // action — upsert so revisiting an already-read post is a no-op rather
  // than an error against the unique [studentId, announcementId] constraint.
  await prisma.announcementRead.upsert({
    where: { studentId_announcementId: { studentId: student.id, announcementId } },
    update: {},
    create: { studentId: student.id, announcementId },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/dashboard/announcements">Bản tin</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{announcement.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatDateVN(announcement.publishedAt)}
        </p>
      </div>

      {announcement.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={announcement.coverImageUrl}
          alt=""
          className="aspect-video w-full rounded-xl border border-border object-cover"
        />
      )}

      <Card>
        <LessonMarkdown content={announcement.content} />
      </Card>
    </div>
  );
}
