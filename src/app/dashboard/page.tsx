import Link from "next/link";
import { requireActiveStudent } from "@/lib/access";
import { ORDERED_LEVELS, LEVEL_LABELS, hasLevelAccess } from "@/lib/levels";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied } = await searchParams;

  return (
    <div className="space-y-6">
      {denied && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Bạn không có quyền truy cập nội dung đó.
        </p>
      )}
      <h1 className="text-xl font-semibold">5 Cấp Đào Tạo</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {ORDERED_LEVELS.map((level) => {
          const unlocked = hasLevelAccess(student.grantedLevel, level);
          const card = (
            <div
              className={`rounded-lg border p-4 ${
                unlocked
                  ? "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800"
                  : "border-zinc-100 bg-zinc-50 opacity-60 dark:border-zinc-900 dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{LEVEL_LABELS[level]}</span>
                {!unlocked && <span aria-hidden>🔒</span>}
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {unlocked ? "Đã mở khóa" : "Chưa được cấp quyền"}
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
