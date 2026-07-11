import { requireGuestAnnouncementAccess } from "@/lib/access";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { formatDateVN } from "@/lib/date";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flag.
export const dynamic = "force-dynamic";

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
