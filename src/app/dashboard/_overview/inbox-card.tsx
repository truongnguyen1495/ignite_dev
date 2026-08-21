import Link from "next/link";
import { Megaphone } from "lucide-react";
import type { User } from "@prisma/client";
import { ANNOUNCEMENT_CATEGORY_LABELS } from "@/lib/announcements";
import { dateOnlyVN, formatDateVN } from "@/lib/groups";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getOverviewInbox } from "@/lib/overview";
import { CardHead, EmptyState, OverviewCard, plural } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

export async function InboxCard({ student, copy }: { student: User; copy: Copy }) {
  const inbox = await getOverviewInbox(student);

  return (
    <OverviewCard>
      <CardHead title={copy.inboxTitle} action={{ href: "/dashboard/announcements", label: copy.inboxViewAll }} />

      {inbox.announcements.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-4 w-4" aria-hidden="true" />} body={copy.inboxEmptyBody} />
      ) : (
        <ul className="flex flex-col">
          {inbox.announcements.map((item, index) => (
            <li key={item.id} className={`flex gap-2.5 py-2.5 ${index === 0 ? "pt-0" : "border-t border-border"}`}>
              <span
                aria-hidden="true"
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  item.unread ? "bg-primary" : "border border-faint"
                }`}
              />
              <Link href="/dashboard/announcements" className="min-w-0 group">
                <b className="block text-[13px] font-medium leading-snug text-foreground group-hover:text-primary-hover">
                  {item.title}
                </b>
                <span className="mt-1 block font-mono text-[10.5px] tabular-nums text-faint">
                  {formatDateVN(dateOnlyVN(item.publishedAt))} · {ANNOUNCEMENT_CATEGORY_LABELS[item.category]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Hidden entirely when the chat feature is switched off, the same way
          the sidebar drops its row rather than leaving a dead end. */}
      {inbox.unreadMessages !== null && (
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-[13px]">
          <span className="min-w-0 flex-1">
            {inbox.unreadMessages > 0 ? (
              <b className="font-medium tabular-nums text-foreground">
                {inbox.unreadMessages}{" "}
                {plural(inbox.unreadMessages, copy.messagesUnreadOne, copy.messagesUnreadMany)}
              </b>
            ) : (
              <span className="text-muted">{copy.messagesAllRead}</span>
            )}
          </span>
          <Link
            href="/dashboard/chat"
            className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            {copy.actionOpen}
          </Link>
        </div>
      )}
    </OverviewCard>
  );
}
