import Link from "next/link";
import type { Level } from "@prisma/client";
import { ArrowRight, Clock, Lock, PartyPopper } from "lucide-react";
import { LEVEL_LABELS } from "@/lib/levels";

// The end of the track. Only rendered on the student's OWN current level —
// re-reading a level they've already passed shouldn't offer to promote
// them again.
//
// The condition shown here is the real one enforced by
// requestLevelUpAction: every quiz at this level passed. It deliberately
// does NOT require every lesson to be marked done, so this box can never
// promise something /dashboard/level-up then refuses.
export function LevelUpGate({
  upcoming,
  pendingToLevel,
  pendingQuizCount,
  unmarkedLessonCount,
}: {
  /** Null when this is the top of the ladder. */
  upcoming: Level | null;
  /** Set when a level-up request is already awaiting review. */
  pendingToLevel: Level | null;
  /** Quizzes at this level with no passing attempt yet. */
  pendingQuizCount: number;
  /** Finished-enough-for-level-up but still unmarked lessons, for the note below. */
  unmarkedLessonCount: number;
}) {
  if (!upcoming) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent-border bg-accent-bg p-5">
        <PartyPopper className="h-5 w-5 shrink-0 text-accent-hover" />
        <p className="text-sm font-medium text-foreground">
          Bạn đang ở cấp cao nhất — không còn cấp nào để lên nữa.
        </p>
      </div>
    );
  }

  if (pendingToLevel) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-border bg-warning-bg p-5">
        <span className="flex items-center gap-3">
          <Clock className="h-5 w-5 shrink-0 text-warning" />
          <span className="flex flex-col">
            <strong className="text-sm font-semibold text-foreground">
              Yêu cầu lên {LEVEL_LABELS[pendingToLevel]} đang chờ duyệt
            </strong>
            <span className="text-sm text-muted">Super Admin sẽ xem xét trong thời gian sớm nhất.</span>
          </span>
        </span>
        <Link
          href="/dashboard/level-up"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Xem yêu cầu
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (pendingQuizCount > 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface p-5">
        <span className="flex items-center gap-3">
          <Lock className="h-5 w-5 shrink-0 text-faint" />
          <span className="flex flex-col">
            <strong className="text-sm font-semibold text-foreground">
              Còn {pendingQuizCount} bài test cần đạt để xin lên {LEVEL_LABELS[upcoming]}
            </strong>
            <span className="text-sm text-muted">
              Đạt hết bài test của cấp này, nút xin lên cấp sẽ tự mở ngay tại đây.
            </span>
          </span>
        </span>
        <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-surface-hover px-4 py-2 text-sm font-medium text-faint">
          Xin lên {LEVEL_LABELS[upcoming]}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-border bg-accent-bg p-5">
      <span className="flex items-center gap-3">
        <PartyPopper className="h-5 w-5 shrink-0 text-accent-hover" />
        <span className="flex flex-col">
          <strong className="text-sm font-semibold text-foreground">
            Bạn đã đủ điều kiện lên {LEVEL_LABELS[upcoming]}
          </strong>
          <span className="text-sm text-muted">
            {unmarkedLessonCount > 0
              ? `Còn ${unmarkedLessonCount} bài chưa đánh dấu đã học, nhưng điều kiện lên cấp chỉ tính bài test.`
              : "Gửi yêu cầu để Super Admin duyệt."}
          </span>
        </span>
      </span>
      <Link
        href="/dashboard/level-up"
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        Xin lên {LEVEL_LABELS[upcoming]}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
