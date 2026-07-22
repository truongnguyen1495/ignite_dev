import Link from "next/link";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { requireLeveledStudent } from "@/lib/access";
import { ORDERED_LEVELS, LEVEL_NAMES, hasLevelAccess } from "@/lib/levels";
import { LevelBadge } from "@/components/ui/level-badge";
import { getDictionary } from "@/lib/i18n/get-locale";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const student = await requireLeveledStudent();
  const { denied } = await searchParams;
  const { t } = await getDictionary();

  return (
    <div className="space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          {t.dashboardLevelsPage.accessDenied}
        </p>
      )}
      <h1 className="text-2xl font-semibold text-foreground">{t.dashboardLevelsPage.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {ORDERED_LEVELS.map((level) => {
          const unlocked = hasLevelAccess(student.grantedLevel, level);
          const card = (
            <div
              className={`rounded-xl border p-5 transition-colors ${
                unlocked
                  ? "border-border bg-surface hover:border-primary/50"
                  : "border-border bg-surface/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LevelBadge level={level} />
                  <span className="font-medium text-foreground">{LEVEL_NAMES[level]}</span>
                </div>
                {unlocked ? (
                  <Unlock className="h-4 w-4 text-success" />
                ) : (
                  <Lock className="h-4 w-4 text-muted" />
                )}
              </div>
              <p className="mt-2 text-sm text-muted">
                {unlocked ? t.dashboardLevelsPage.unlocked : t.dashboardLevelsPage.locked}
              </p>
            </div>
          );

          return unlocked ? (
            <Link key={level} href={`/dashboard/levels/${level}`}>
              {card}
            </Link>
          ) : (
            <div key={level}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
