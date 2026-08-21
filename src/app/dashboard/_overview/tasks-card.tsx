import Link from "next/link";
import { Check, ListChecks, Users } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getOverviewPulse, getOverviewTasks, type OverviewTaskStatus } from "@/lib/overview";
import { CardHead, EmptyState, OverviewCard } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

const STATUS_LABEL: Record<OverviewTaskStatus, keyof Copy> = {
  done: "taskStatusDone",
  excused: "taskStatusExcused",
  awaitingReview: "taskStatusAwaitingReview",
  rejected: "taskStatusRejected",
  overdue: "taskStatusOverdue",
  pending: "taskStatusPending",
};

/**
 * Read-only here — ticking a task off stays on /dashboard/my-group, which
 * owns the action and the explanation form. This card reports the day.
 */
function StatusBox({ status }: { status: OverviewTaskStatus }) {
  const done = status === "done" || status === "excused";
  const late = status === "overdue" || status === "rejected";
  return (
    <span
      aria-hidden="true"
      className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] border text-[10px] font-bold ${
        done
          ? "border-success bg-success text-success-foreground"
          : late
            ? "border-danger text-danger"
            : status === "awaitingReview"
              ? "border-warning text-warning"
              : "border-border-strong text-transparent"
      }`}
    >
      {done ? <Check className="h-3 w-3" strokeWidth={3} /> : late ? "!" : status === "awaitingReview" ? "·" : ""}
    </span>
  );
}

function Mini({ value, label, tone = "" }: { value: React.ReactNode; label: React.ReactNode; tone?: string }) {
  return (
    <div className="text-center">
      <span className={`block font-mono text-lg font-medium tabular-nums ${tone || "text-foreground"}`}>{value}</span>
      <span className="text-[11px] leading-tight text-muted">{label}</span>
    </div>
  );
}

export async function TasksCard({ studentId, copy }: { studentId: string; copy: Copy }) {
  // getOverviewTasks resolves the pulse on its way in, so the second await is
  // a settled cache entry, not a second trip to the database.
  const tasks = await getOverviewTasks(studentId);
  const pulse = await getOverviewPulse(studentId);

  if (!tasks.inGroup) {
    return (
      <OverviewCard>
        <CardHead title={copy.tasksTitle} />
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-faint-bg text-faint">
            <Users className="h-4 w-4" aria-hidden="true" />
          </span>
          <b className="text-sm font-medium text-foreground">{copy.tasksNoGroupTitle}</b>
          <p className="max-w-sm text-xs text-muted">{copy.tasksNoGroupBody}</p>
        </div>
      </OverviewCard>
    );
  }

  return (
    <OverviewCard>
      <CardHead
        title={copy.tasksTitle}
        action={{ href: "/dashboard/my-group", label: tasks.groupName ?? copy.tasksViewGroup }}
      />

      {tasks.tasks.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-4 w-4" aria-hidden="true" />} body={copy.tasksEmptyBody} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {tasks.tasks.map((task) => {
            const done = task.status === "done" || task.status === "excused";
            return (
              <li key={task.id} className="flex items-center gap-3 text-sm">
                <StatusBox status={task.status} />
                <span className={`min-w-0 flex-1 truncate ${done ? "text-faint line-through" : "text-foreground"}`}>
                  {task.title}
                </span>
                {task.status !== "done" && task.status !== "pending" && (
                  <span
                    className={`hidden shrink-0 text-[11px] sm:block ${
                      task.status === "overdue" || task.status === "rejected" ? "text-danger" : "text-muted"
                    }`}
                  >
                    {copy[STATUS_LABEL[task.status]]}
                  </span>
                )}
                {task.points > 0 && (
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-primary">+{task.points}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
        <Mini
          tone="text-primary-hover"
          value={pulse.streak.current}
          label={
            <>
              {copy.miniStreak}
              <br />
              <span className="tabular-nums">
                {copy.miniStreakBest} {pulse.streak.best}
              </span>
            </>
          }
        />
        <Mini
          value={pulse.weeklyPoints}
          label={
            <>
              {copy.miniPoints}
              {pulse.group && pulse.group.rank > 0 && (
                <>
                  <br />
                  <span className="tabular-nums">
                    {copy.miniRank} {pulse.group.rank}/{pulse.group.memberCount}
                  </span>
                </>
              )}
            </>
          }
        />
        <Mini tone="text-info" value={tasks.spinsRemaining} label={copy.miniSpins} />
      </div>

      <Link
        href="/dashboard/my-group"
        className="mt-3 block rounded-lg border border-border-strong py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-surface-hover sm:hidden"
      >
        {copy.tasksViewGroup}
      </Link>
    </OverviewCard>
  );
}
