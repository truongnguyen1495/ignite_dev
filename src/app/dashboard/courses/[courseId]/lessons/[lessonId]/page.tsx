import { requireCourseLessonAccess } from "@/lib/access";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LessonMarkdown } from "@/components/lesson-markdown";
import { BackLink } from "@/components/ui/back-link";

export default async function StudentCourseLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { lesson } = await requireCourseLessonAccess(lessonId);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/dashboard/courses/${courseId}`}>Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{lesson.title}</h1>
      </div>

      {lesson.youtubeId && <YoutubeEmbed videoId={lesson.youtubeId} />}

      {lesson.content && (
        <article className="rounded-xl border border-border bg-surface p-6">
          <LessonMarkdown content={lesson.content} />
        </article>
      )}
    </div>
  );
}
