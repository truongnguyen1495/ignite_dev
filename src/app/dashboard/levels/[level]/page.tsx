import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLevelAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, parseLevel } from "@/lib/levels";

export default async function LevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level: levelParam } = await params;
  const level = parseLevel(levelParam);
  if (!level) {
    notFound();
  }

  // requireLevelAccess re-checks grantedLevel fresh from the DB — this is
  // what blocks a student from viewing a level's lesson list via direct URL.
  await requireLevelAccess(level);

  const lessons = await prisma.lesson.findMany({
    where: { level },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Quay lại
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{LEVEL_LABELS[level]}</h1>
      </div>
      {lessons.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có bài học nào ở cấp này.</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/dashboard/lessons/${lesson.id}`}
                className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800"
              >
                {lesson.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
