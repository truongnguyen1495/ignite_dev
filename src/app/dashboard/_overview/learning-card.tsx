import Link from "next/link";
import { Lock, PlayCircle } from "lucide-react";
import type { User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { LevelBadge } from "@/components/ui/level-badge";
import { LEVEL_NAMES } from "@/lib/levels";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getOverviewRoadmap } from "@/lib/overview";
import { CardHead, OverviewCard, ProgressBar, plural } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];
type LevelsCopy = Dictionary["dashboardLevelsPage"];

function Requirement({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-baseline gap-2 rounded-lg bg-faint-bg px-3 py-1.5">
      <span className="text-xs text-muted">{label}</span>
      <b className="font-mono text-sm font-medium tabular-nums text-foreground">{value}</b>
    </span>
  );
}

export async function LearningCard({
  student,
  copy,
  levelsCopy,
}: {
  student: User;
  copy: Copy;
  /** Reused rather than re-translated: the roadmap page already owns these. */
  levelsCopy: LevelsCopy;
}) {
  const roadmap = await getOverviewRoadmap(student.id, student.grantedLevel);
  const { current, nextLesson, pendingQuizzes, upcoming, latestRequest } = roadmap;

  const testsLeft = pendingQuizzes.length;
  // Passing every test at this level is the WHOLE condition — marking lessons
  // done has never been part of it (see requestLevelUpAction's server-side
  // gate, and the note on dashboardLevelsPage.unlockHint). Adding "finish the
  // lessons too" here would have this card refuse someone the level-up page
  // then lets straight through.
  const eligible = testsLeft === 0;

  return (
    <OverviewCard>
      <CardHead title={copy.learningTitle} action={{ href: "/dashboard/lo-trinh", label: copy.learningViewRoadmap }} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <LevelBadge level={current.level} />
            <Badge color="primary">{levelsCopy.youAreHere}</Badge>
          </span>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{LEVEL_NAMES[current.level]}</h3>
        </div>

        {nextLesson && (
          <Link
            href={`/dashboard/lessons/${nextLesson.id}`}
            className="inline-flex max-w-full items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <PlayCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {current.completedCount === 0 ? levelsCopy.startLabel : levelsCopy.continueLabel}: {nextLesson.title}
            </span>
          </Link>
        )}
      </div>

      {current.lessonCount === 0 ? (
        <p className="mt-4 text-sm text-muted">{copy.learningNoLessons}</p>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted">
            <span className="tabular-nums">
              {current.completedCount} / {current.lessonCount}{" "}
              {plural(current.lessonCount, levelsCopy.lessonOne, levelsCopy.lessonMany)}{" "}
              {levelsCopy.completedSuffix}
              {current.quizCount > 0 && (
                <>
                  {" · "}
                  {current.quizCount - testsLeft} / {current.quizCount}{" "}
                  {plural(current.quizCount, levelsCopy.testOne, levelsCopy.testMany)} {levelsCopy.passedSuffix}
                </>
              )}
            </span>
            <b className="font-mono font-medium tabular-nums text-foreground">{current.percent}%</b>
          </div>
          <ProgressBar percent={current.percent} />
        </div>
      )}

      {/* The gate, in the one state that actually applies right now. */}
      <div className="mt-4 rounded-xl border border-warning-border bg-warning-bg p-4">
        {!upcoming ? (
          <p className="text-sm text-foreground">{copy.gateAtTop}</p>
        ) : latestRequest?.status === "PENDING" ? (
          <p className="text-sm text-foreground">{copy.gatePending}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Lock className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wider text-warning">{copy.gateHeading}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {copy.gateNextLevel}
                <LevelBadge level={upcoming} full />
              </span>
            </div>

            {eligible ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm text-foreground">{copy.gateReady}</p>
                <Link
                  href="/dashboard/level-up"
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {copy.gateAction}
                </Link>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Requirement label={copy.gateTestsLeft} value={testsLeft} />
                <p className="text-xs text-muted">{levelsCopy.unlockHint}</p>
              </div>
            )}

            {latestRequest?.status === "REJECTED" && (
              <p className="mt-3 text-xs text-muted">{copy.gateRejected}</p>
            )}
          </>
        )}
      </div>
    </OverviewCard>
  );
}
