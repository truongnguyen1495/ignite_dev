import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { requireLevelAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS, parseLevel } from "@/lib/levels";
import { BackLink } from "@/components/ui/back-link";

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
        <BackLink href="/dashboard">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{LEVEL_LABELS[level]}</h1>
      </div>
      {lessons.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bài học nào ở cấp này.</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/dashboard/lessons/${lesson.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/50"
              >
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-foreground">{lesson.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
