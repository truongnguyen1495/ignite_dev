import Link from "next/link";
import { Check, ClipboardList, Clock, Eye, PlayCircle } from "lucide-react";
import { formatLessonDuration, type LevelLessonProgressItem } from "@/lib/level-progress";
import { Badge } from "@/components/ui/badge";

// The lessons of one level as a vertical path: a rail with one node per
// lesson, so the student reads their position in the level at a glance
// instead of a flat list where every row looks the same. Numbering is
// meaningful here — Lesson.order is a real sequence the student is meant
// to walk in order (nothing is locked, it's the suggested path).
export function LessonTrack({
  items,
  nextLessonId,
}: {
  items: LevelLessonProgressItem[];
  /** The first unfinished lesson — highlighted as "Tiếp theo". */
  nextLessonId: string | null;
}) {
  return (
    <ol className="relative space-y-3">
      {/* The rail. Inset top/bottom so it starts and ends inside the first
          and last node rather than dangling past them. */}
      {items.length > 1 && (
        <span
          aria-hidden
          className="absolute left-[15px] top-8 bottom-8 w-0.5 rounded-full bg-border"
        />
      )}

      {items.map((item, index) => {
        const isNext = item.id === nextLessonId;
        return (
          <li key={item.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:gap-4">
            {/* Every branch sets its own background: a shared `bg-surface`
                in the base would collide with `bg-success` here — which of
                the two wins depends on their order in the generated
                stylesheet, not on the order written here, and surface-white
                won, hiding the white checkmark on a white circle. */}
            <span
              className={`relative z-10 mt-3.5 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums ${
                item.completed
                  ? "border-success bg-success text-white"
                  : isNext
                    ? "border-primary bg-surface text-primary ring-4 ring-primary-bg"
                    : "border-border bg-surface text-faint"
              }`}
            >
              {item.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
            </span>

            <Link
              href={`/dashboard/lessons/${item.id}`}
              className={`flex items-start justify-between gap-3 rounded-xl border bg-surface p-4 transition-colors ${
                isNext
                  ? "border-primary-border ring-2 ring-primary-bg hover:border-primary-border-hover"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                  Bài {index + 1}
                </span>
                <span className="text-[15px] font-medium leading-snug text-foreground">{item.title}</span>
                {item.description && (
                  <span className="line-clamp-2 text-sm text-muted">{item.description}</span>
                )}
                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {item.durationSeconds != null ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-faint" />
                      {formatLessonDuration(item.durationSeconds)}
                    </span>
                  ) : (
                    item.hasVideo && (
                      <span className="inline-flex items-center gap-1.5">
                        <PlayCircle className="h-3.5 w-3.5 text-faint" />
                        Có video
                      </span>
                    )
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-faint" />
                    {item.quizId ? "Có bài test" : "Không có bài test"}
                  </span>
                  {!item.completed && item.watchedPercent != null && item.watchedPercent > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-faint" />
                      Đã xem {item.watchedPercent}%
                    </span>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-2">
                <LessonStatusBadge item={item} />
                {isNext && (
                  <span className="hidden rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground sm:inline-block">
                    Học tiếp
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

// Four states, not two: the old page only knew "Đã hoàn thành"/"Chưa hoàn
// thành", which left a quiz-less lesson stuck on the latter forever and
// said nothing about a lesson watched but never tested.
function LessonStatusBadge({ item }: { item: LevelLessonProgressItem }) {
  if (item.completed) {
    return <Badge color="success">Đã hoàn thành</Badge>;
  }
  if (item.quizId && item.started) {
    return <Badge color="warning">Cần đạt bài test</Badge>;
  }
  if (item.started) {
    return <Badge color="info">Đang học</Badge>;
  }
  return <Badge color="faint">Chưa học</Badge>;
}
