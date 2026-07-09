import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireLessonAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LEVEL_LABELS } from "@/lib/levels";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { BackLink } from "@/components/ui/back-link";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Card } from "@/components/ui/card";

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
        <BackLink href={`/dashboard/levels/${lesson.level}`}>{LEVEL_LABELS[lesson.level]}</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{lesson.title}</h1>
      </div>

      {lesson.youtubeId && <YoutubeEmbed videoId={lesson.youtubeId} />}

      <Card>
        <CollapsibleSection title="Nội dung bài học">
          <div className="mt-4">
            <LessonMarkdown content={lesson.content} />
          </div>
        </CollapsibleSection>
      </Card>

      {quiz && (
        <Link
          href={`/dashboard/quizzes/${quiz.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <ClipboardList className="h-4 w-4" />
          Làm bài test
        </Link>
      )}
    </div>
  );
}
