import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";

export default async function LessonsPage() {
  const lessons = await prisma.lesson.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: { quiz: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bài học</h1>
        <Link
          href="/admin/lessons/new"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          + Thêm bài học
        </Link>
      </div>

      {ORDERED_LEVELS.map((level) => {
        const levelLessons = lessons.filter((l) => l.level === level);
        return (
          <div key={level} className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-500">{LEVEL_LABELS[level]}</h2>
            {levelLessons.length === 0 ? (
              <p className="text-sm text-zinc-400">Chưa có bài học.</p>
            ) : (
              <ul className="space-y-2">
                {levelLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/admin/lessons/${lesson.id}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:border-zinc-400 dark:border-zinc-800"
                    >
                      <span>{lesson.title}</span>
                      <span className="text-xs text-zinc-400">
                        {lesson.youtubeId ? "🎬 " : ""}
                        {lesson.quiz ? "📝 có bài test" : "chưa có bài test"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
