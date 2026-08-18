import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lock,
  Package,
  PlayCircle,
} from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { LEVEL_NAMES } from "@/lib/levels";
import { getLevelRoadmap, type LevelRoadmapStep } from "@/lib/level-roadmap";
import { getDictionary } from "@/lib/i18n/get-locale";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LevelBadge } from "@/components/ui/level-badge";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { LevelUpPanel } from "./level-up/level-up-panel";

type Copy = Dictionary["dashboardLevelsPage"];

/** English inflects, Vietnamese doesn't — see the note in dictionaries.ts. */
function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Decorative on purpose. Every bar on this page sits next to the same
 * figure written out as text ("1 / 3 bài học đã hoàn thành"), so exposing
 * it as a named progressbar would only make a screen reader read the
 * number twice.
 */
function ProgressBar({ percent, complete }: { percent: number; complete: boolean }) {
  return (
    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
      <div
        className={`h-full rounded-full transition-all ${complete ? "bg-success" : "bg-primary"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * "3 bài học · 1 bài test" — the level's size, shown for locked levels too
 * so a member can see what's waiting up the ladder. Counts only; lesson
 * titles never leave the server for a level the student can't open.
 */
function LevelSize({ step, copy }: { step: LevelRoadmapStep; copy: Copy }) {
  return (
    <span className="tabular-nums">
      {step.lessonCount} {plural(step.lessonCount, copy.lessonOne, copy.lessonMany)}
      {step.quizCount > 0 && (
        <>
          {" · "}
          {step.quizCount} {plural(step.quizCount, copy.testOne, copy.testMany)}
        </>
      )}
    </span>
  );
}

/** What reaching this level makes available. Nothing renders when it grants nothing. */
function UnlockChips({ step, copy }: { step: LevelRoadmapStep; copy: Copy }) {
  const rewards = [
    {
      kind: "courses",
      count: step.unlocks.courses,
      icon: GraduationCap,
      word: plural(step.unlocks.courses, copy.courseOne, copy.courseMany),
    },
    {
      kind: "library",
      count: step.unlocks.library,
      icon: BookOpen,
      word: plural(step.unlocks.library, copy.libraryOne, copy.libraryMany),
    },
    {
      kind: "products",
      count: step.unlocks.products,
      icon: Package,
      word: plural(step.unlocks.products, copy.productOne, copy.productMany),
    },
  ].filter((reward) => reward.count > 0);

  if (rewards.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {rewards.map((reward) => (
        // Accent, not primary: globals.css reserves this family for earned
        // and celebratory moments, which is exactly what a reward chip is.
        <span
          key={reward.kind}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-bg px-2.5 py-1 text-xs font-medium text-accent-hover"
        >
          <reward.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{reward.count}</span> {reward.word}
        </span>
      ))}
    </div>
  );
}

const STATUS_BADGE: Record<LevelRoadmapStep["status"], BadgeColor> = {
  completed: "success",
  unlocked: "info",
  current: "primary",
  next: "warning",
  locked: "faint",
};

const CARD_CLASSES: Record<LevelRoadmapStep["status"], string> = {
  completed: "border-border bg-surface",
  unlocked: "border-border bg-surface",
  current: "border-primary-border bg-primary-bg-subtle",
  next: "border-dashed border-border-strong bg-surface",
  locked: "border-dashed border-border bg-surface",
};

function LevelCard({ step, copy }: { step: LevelRoadmapStep; copy: Copy }) {
  const statusLabel: Record<LevelRoadmapStep["status"], string> = {
    completed: copy.statusCompleted,
    unlocked: copy.unlocked,
    current: copy.statusCurrent,
    next: copy.statusNext,
    locked: copy.locked,
  };

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <LevelBadge level={step.level} />
          <span className={`font-medium ${step.unlocked ? "text-foreground" : "text-muted"}`}>
            {LEVEL_NAMES[step.level]}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {step.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {(step.status === "next" || step.status === "locked") && (
            <Lock className="h-3.5 w-3.5 text-faint" />
          )}
          <Badge color={STATUS_BADGE[step.status]}>{statusLabel[step.status]}</Badge>
        </span>
      </div>

      {step.lessonCount === 0 ? (
        <p className="text-xs text-muted">{copy.noLessons}</p>
      ) : step.unlocked ? (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
            <LevelSize step={step} copy={copy} />
            <span className="font-medium tabular-nums text-foreground">
              {step.completedCount}/{step.lessonCount}
            </span>
          </div>
          <ProgressBar percent={step.percent} complete={step.percent === 100} />
        </div>
      ) : (
        <p className="text-xs text-muted">
          <LevelSize step={step} copy={copy} />
        </p>
      )}

      {step.status === "next" && <p className="text-xs text-muted">{copy.unlockHint}</p>}

      <UnlockChips step={step} copy={copy} />
    </>
  );

  const shell = `flex flex-col gap-3 rounded-xl border p-4 ${CARD_CLASSES[step.status]}`;

  return step.href ? (
    <Link href={step.href} className={`${shell} transition-colors hover:border-primary-border-hover`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied } = await searchParams;
  const { t } = await getDictionary();
  const copy = t.dashboardLevelsPage;

  const roadmap = await getLevelRoadmap(student.id, student.grantedLevel);
  const { current, nextLesson, pendingQuizzes } = roadmap;
  const passedQuizCount = current.quizCount - pendingQuizzes.length;

  return (
    <div className="space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {copy.accessDenied}
        </p>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {copy.currentLevel}
          <LevelBadge level={student.grantedLevel} full />
        </p>
      </div>

      {/* The level the member is standing on, pulled out of the grid: their
          own progress, the way back into the lesson they stopped at, and the
          level-up gate that used to live only on /dashboard/level-up. */}
      <section className="space-y-4 rounded-xl border border-primary-border bg-primary-bg-subtle p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={current.level} />
              <Badge color="primary">{copy.youAreHere}</Badge>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground">
              {LEVEL_NAMES[current.level]}
            </h2>
            {current.lessonCount > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted">
                <span className="tabular-nums">
                  {current.completedCount} / {current.lessonCount}{" "}
                  {plural(current.lessonCount, copy.lessonOne, copy.lessonMany)}{" "}
                  {copy.completedSuffix}
                </span>
                {current.quizCount > 0 && (
                  <span className="tabular-nums">
                    {passedQuizCount} / {current.quizCount}{" "}
                    {plural(current.quizCount, copy.testOne, copy.testMany)} {copy.passedSuffix}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {nextLesson && (
              <Link
                href={`/dashboard/lessons/${nextLesson.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <PlayCircle className="h-4 w-4 shrink-0" />
                <span className="max-w-[16rem] truncate">
                  {current.completedCount === 0 ? copy.startLabel : copy.continueLabel}:{" "}
                  {nextLesson.title}
                </span>
              </Link>
            )}
            {current.href && (
              <Link
                href={current.href}
                className="inline-flex items-center rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                {copy.viewLevel}
              </Link>
            )}
          </div>
        </div>

        {current.lessonCount === 0 ? (
          <p className="text-sm text-muted">{copy.noLessons}</p>
        ) : (
          <ProgressBar percent={current.percent} complete={current.percent === 100} />
        )}

        <div className="border-t border-border pt-4">
          <LevelUpPanel
            upcoming={roadmap.upcoming}
            latestRequest={roadmap.latestRequest}
            pendingQuizzes={pendingQuizzes}
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {roadmap.steps.map((step) => (
          <LevelCard key={step.level} step={step} copy={copy} />
        ))}
      </div>
    </div>
  );
}
