import type { User } from "@prisma/client";
import { LevelBadge } from "@/components/ui/level-badge";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatDateVN, isPastTimeOfDayVN, todayVN } from "@/lib/groups";
import { getOverviewPulse } from "@/lib/overview";
import { plural } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

// Reuses the same Vietnam-time helper the daily-task deadlines run on, so a
// server in UTC still says "Chào buổi sáng" at 8am in Hanoi rather than at
// 3pm — see the VN_OFFSET_MS note in src/lib/groups.ts.
function greetingFor(copy: Copy): string {
  if (!isPastTimeOfDayVN("11:00")) return copy.greetingMorning;
  if (!isPastTimeOfDayVN("18:00")) return copy.greetingAfternoon;
  return copy.greetingEvening;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[10px] font-medium uppercase tracking-wider text-faint">{label}</span>
      <span className="font-mono text-xl font-medium tabular-nums text-foreground">{children}</span>
    </div>
  );
}

/**
 * The three numbers on the right of the greeting. Split out from the strip
 * itself so the name, date and level — which are already in hand — paint
 * immediately, and only this part waits behind its <Suspense>.
 */
export async function PulseStats({ studentId, copy }: { studentId: string; copy: Copy }) {
  const pulse = await getOverviewPulse(studentId);

  return (
    <div className="flex flex-wrap gap-x-7 gap-y-3">
      <Stat label={copy.statStreak}>
        {pulse.streak.current}{" "}
        <small className="text-xs font-normal text-muted">
          {plural(pulse.streak.current, copy.unitDayOne, copy.unitDayMany)}
        </small>
      </Stat>
      <Stat label={copy.statWeeklyPoints}>{pulse.weeklyPoints}</Stat>
      <Stat label={copy.statGroupRank}>
        {pulse.group && pulse.group.rank > 0 ? (
          <>
            {pulse.group.rank} <small className="text-xs font-normal text-muted">/ {pulse.group.memberCount}</small>
          </>
        ) : (
          <span className="text-sm font-normal text-faint">{copy.noGroupShort}</span>
        )}
      </Stat>
    </div>
  );
}

export function GreetingStrip({
  student,
  children,
  copy,
}: {
  student: User;
  /** The <Suspense>-wrapped <PulseStats />, injected by the page. */
  children: React.ReactNode;
  copy: Copy;
}) {
  return (
    <section className="flex flex-wrap items-center gap-x-7 gap-y-4 rounded-2xl border border-primary-border bg-primary-bg-subtle p-5 sm:p-6">
      <div className="min-w-0 flex-1 basis-64">
        <h1 className="text-balance text-xl font-semibold text-foreground sm:text-2xl">
          {greetingFor(copy)}, {student.name}
        </h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-mono tabular-nums">{formatDateVN(todayVN())}</span>
          <LevelBadge level={student.grantedLevel} full />
        </p>
      </div>
      {children}
    </section>
  );
}
