import Link from "next/link";
import Markdown from "react-markdown";
import { requireLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/levels";
import { YoutubeEmbed } from "@/components/youtube-embed";

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;

  // requireLessonAccess re-fetches grantedLevel fresh from the DB and blocks
  // this page server-side if the student isn't allowed to see this lesson's
  // level — this is what stops direct-URL access, not just hidden nav links.
  const { lesson } = await requireLessonAccess(lessonId);

  const quiz = await prisma.quiz.findUnique({ where: { lessonId: lesson.id } });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/levels/${lesson.level}`} className="text-sm text-zinc-500 hover:underline">
          ← {LEVEL_LABELS[lesson.level]}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{lesson.title}</h1>
      </div>

      {lesson.youtubeId && <YoutubeEmbed videoId={lesson.youtubeId} />}

      <article className="prose prose-zinc max-w-none dark:prose-invert">
        <Markdown>{lesson.content}</Markdown>
      </article>

      {quiz && (
        <Link
          href={`/dashboard/quizzes/${quiz.id}`}
          className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Làm bài test →
        </Link>
      )}
    </div>
  );
}
