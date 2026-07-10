import { requireGuestAnnouncementAccess } from "@/lib/access";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";

export default async function GuestAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;
  const { announcement } = await requireGuestAnnouncementAccess(announcementId);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <BackLink href="/guest/announcements">Bản tin</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{announcement.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {announcement.publishedAt.toLocaleDateString("vi-VN")}
        </p>
      </div>

      <Card>
        <LessonMarkdown content={announcement.content} />
      </Card>
    </div>
  );
}
