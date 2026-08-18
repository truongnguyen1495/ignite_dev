import Link from "next/link";
import type { Level, LevelUpStatus } from "@prisma/client";
import { ChevronRight, Clock, Lock, PartyPopper, XCircle } from "lucide-react";
import { getDictionary } from "@/lib/i18n/get-locale";
import { LevelBadge } from "@/components/ui/level-badge";
import { RequestLevelUpButton } from "./request-button";

export type LevelUpPanelProps = {
  /** Null at the top of the ladder — there is nothing to request. */
  upcoming: Level | null;
  latestRequest: {
    status: LevelUpStatus;
    toLevel: Level;
    reviewerNote: string | null;
  } | null;
  /**
   * Quizzes at the student's current level with no passing attempt yet.
   * Empty means eligible. This is the whole gate: requestLevelUpAction
   * checks exactly this and nothing about lessons marked done, so the panel
   * can never offer a request the action would then silently drop.
   */
  pendingQuizzes: { lessonId: string; title: string }[];
};

/**
 * The level-up gate, rendered both inside the roadmap on /dashboard and as
 * the body of /dashboard/level-up itself. One component rather than two
 * views of the same rule — the two pages cannot tell a student different
 * things about whether they may advance.
 */
export async function LevelUpPanel({ upcoming, latestRequest, pendingQuizzes }: LevelUpPanelProps) {
  const { t } = await getDictionary();
  const copy = t.levelUpPanel;

  if (!upcoming) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent-border bg-accent-bg p-4">
        <PartyPopper className="h-5 w-5 shrink-0 text-accent-hover" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{copy.maxTitle}</p>
          <p className="text-sm text-muted">{copy.maxBody}</p>
        </div>
      </div>
    );
  }

  if (latestRequest?.status === "PENDING") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-warning-border bg-warning-bg p-4">
        <Clock className="h-5 w-5 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            {copy.pendingTitle}
            <LevelBadge level={latestRequest.toLevel} full />
          </p>
          <p className="mt-0.5 text-sm text-muted">{copy.pendingBody}</p>
        </div>
      </div>
    );
  }

  // A rejection stays visible above whichever gate follows: the reviewer's
  // note is the one piece of feedback a student gets, and until now it only
  // ever appeared on /dashboard/level-up, which most never open.
  const rejection =
    latestRequest?.status === "REJECTED" ? (
      <div className="flex items-start gap-3 rounded-xl border border-danger-border bg-danger-bg p-4">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{copy.rejectedTitle}</p>
          {latestRequest.reviewerNote && (
            <p className="mt-0.5 text-sm text-muted">
              <span className="font-medium text-foreground">{copy.rejectedReason}</span>{" "}
              {latestRequest.reviewerNote}
            </p>
          )}
        </div>
      </div>
    ) : null;

  if (pendingQuizzes.length > 0) {
    return (
      <div className="space-y-3">
        {rejection}
        <div className="space-y-3 rounded-xl border border-dashed border-border-strong bg-surface p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-faint" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                {copy.blockedTitle}
                <LevelBadge level={upcoming} full />
              </p>
              <p className="mt-0.5 text-sm text-muted">{copy.blockedBody}</p>
            </div>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {pendingQuizzes.map((quiz) => (
              <li key={quiz.lessonId}>
                <Link
                  href={`/dashboard/lessons/${quiz.lessonId}`}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-surface-hover"
                >
                  <span className="min-w-0 truncate text-foreground">{quiz.title}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
                    {copy.takeTest}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rejection}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-border bg-accent-bg p-4">
        <div className="flex items-start gap-3">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-accent-hover" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
              {copy.readyTitle}
              <LevelBadge level={upcoming} full />
            </p>
            <p className="mt-0.5 text-sm text-muted">{copy.readyBody}</p>
          </div>
        </div>
        <RequestLevelUpButton label={copy.requestButton} />
      </div>
    </div>
  );
}
