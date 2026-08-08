import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { getOrSeedPersonalityTests } from "@/lib/group-data";
import { ORDERED_PERSONALITY_TEST_TYPES, PERSONALITY_TEST_LABELS } from "@/lib/groups";
import { ResultsGrid, type StudentRow } from "./results-grid";

export default async function AdminTestsPage() {
  await requireAdminPermission("MANAGE_TESTS");

  const [tests, students, results] = await Promise.all([
    getOrSeedPersonalityTests(),
    prisma.user.findMany({
      where: { role: "STUDENT", adminOnly: false },
      include: { groupMembership: { include: { group: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.personalityResult.findMany(),
  ]);

  const resultsByUser = new Map<string, typeof results>();
  for (const r of results) {
    const list = resultsByUser.get(r.userId);
    if (list) list.push(r);
    else resultsByUser.set(r.userId, [r]);
  }
  const testById = new Map(tests.map((t) => [t.id, t]));

  const studentRows: StudentRow[] = students.map((s) => {
    const own = resultsByUser.get(s.id) ?? [];
    const rowResults: StudentRow["results"] = {};
    for (const r of own) {
      const test = testById.get(r.testId);
      if (test) rowResults[test.type] = { resultLabel: r.resultLabel, note: r.note };
    }
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      groupName: s.groupMembership?.group.name ?? null,
      results: rowResults,
    };
  });

  const filledCountByType = Object.fromEntries(
    ORDERED_PERSONALITY_TEST_TYPES.map((type) => [type, studentRows.filter((s) => s.results[type]).length])
  ) as Record<string, number>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khám phá bản thân — Kết quả trắc nghiệm"
        description="Admin tự nhập kết quả DISC / MBTI / IQ / EQ cho từng học viên — hệ thống không tự chấm điểm."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDERED_PERSONALITY_TEST_TYPES.map((type) => (
          <div key={type} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted">{PERSONALITY_TEST_LABELS[type]}</span>
              <span className="text-sm font-bold text-foreground">
                {filledCountByType[type]}/{studentRows.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-faint-bg">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${studentRows.length ? Math.round((filledCountByType[type] / studentRows.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <ResultsGrid students={studentRows} tests={tests.map((t) => ({ id: t.id, type: t.type }))} />
    </div>
  );
}
