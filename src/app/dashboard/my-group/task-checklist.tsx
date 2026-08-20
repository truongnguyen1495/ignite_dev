"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Phone, BookOpen, Dumbbell, ClipboardList, MoreHorizontal, Clock } from "lucide-react";
import type { DailyTaskCategory } from "@prisma/client";
import { markTaskDoneAction, submitTaskExplanationAction } from "./actions";
import type { TodayTaskView } from "@/lib/group-data";

const CATEGORY_ICONS: Record<DailyTaskCategory, typeof Phone> = {
  CALL: Phone,
  READING: BookOpen,
  EXERCISE: Dumbbell,
  NOTE: ClipboardList,
  OTHER: MoreHorizontal,
};

export function TaskChecklist({ tasks }: { tasks: TodayTaskView[] }) {
  const doneCount = tasks.filter((t) => t.completion?.status === "DONE").length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Việc cần làm hôm nay</h3>
        {tasks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-faint-bg">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-success">
              {doneCount}/{tasks.length} hoàn thành
            </span>
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted">Hôm nay nhóm bạn chưa có nhiệm vụ nào.</p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((row) => (
            <TaskRowItem key={row.task.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRowItem({ row }: { row: TodayTaskView }) {
  const { task, completion, isOverdueUntouched } = row;
  const [pending, startTransition] = useTransition();
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainError, setExplainError] = useState<string | undefined>();
  const [toggleError, setToggleError] = useState<string | undefined>();
  const router = useRouter();

  const isDone = completion?.status === "DONE";
  const isExplainedPending = completion?.status === "EXPLAINED_PENDING";
  const isExplainedApproved = completion?.status === "EXPLAINED_APPROVED";
  const isExplainedRejected = completion?.status === "EXPLAINED_REJECTED";
  const locked = isExplainedPending || isExplainedApproved;
  const Icon = CATEGORY_ICONS[task.category];

  function toggle() {
    if (locked) return;
    setToggleError(undefined);
    startTransition(async () => {
      const err = await markTaskDoneAction(task.id, !isDone);
      if (err) {
        setToggleError(err);
        return;
      }
      router.refresh();
    });
  }

  function submitExplain() {
    startTransition(async () => {
      const err = await submitTaskExplanationAction(task.id, explainText);
      if (err) {
        setExplainError(err);
        return;
      }
      setExplainOpen(false);
      router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        onClick={toggle}
        disabled={pending || locked}
        aria-pressed={isDone}
        aria-label={isDone ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu hoàn thành"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed ${
          isDone ? "border-success bg-success text-success-foreground" : "border-border-strong bg-surface"
        }`}
      >
        {isDone && <Check className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span
            className={`text-sm font-medium ${
              isDone ? "text-muted line-through decoration-faint" : "text-foreground"
            }`}
          >
            {task.title}
          </span>
          {isOverdueUntouched && (
            <span className="rounded-full border border-warning-border bg-warning-bg px-2 py-0.5 text-[10px] font-bold text-warning">
              Quá hạn {task.dueTime}
            </span>
          )}
        </div>
        {task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}
        {toggleError && <p className="mt-1 text-xs text-danger">{toggleError}</p>}

        {isExplainedPending && (
          <p className="mt-2 flex w-fit items-center gap-1.5 rounded-md border border-info-border bg-info-bg px-2.5 py-1.5 text-xs text-info">
            <Clock className="h-3.5 w-3.5" /> Đã gửi giải trình — chờ trưởng nhóm duyệt
          </p>
        )}
        {isExplainedApproved && (
          <p className="mt-2 w-fit rounded-md border border-success-border bg-success-bg px-2.5 py-1.5 text-xs text-success">
            Giải trình đã được duyệt
          </p>
        )}
        {isExplainedRejected && (
          <p className="mt-2 w-fit rounded-md border border-danger-border bg-danger-bg px-2.5 py-1.5 text-xs text-danger">
            Giải trình đã bị từ chối — nhiệm vụ được ghi nhận là chưa hoàn thành.
          </p>
        )}

        {task.requireExplanation && isOverdueUntouched && !isExplainedPending && !isExplainedApproved && (
          <>
            {!explainOpen ? (
              <button
                type="button"
                onClick={() => setExplainOpen(true)}
                className="mt-2 rounded-md border border-warning-border bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning"
              >
                Gửi giải trình lý do
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                <textarea
                  value={explainText}
                  onChange={(e) => setExplainText(e.target.value)}
                  placeholder="Lý do chưa hoàn thành..."
                  className="min-h-[64px] w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                {explainError && <p className="text-xs text-danger">{explainError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={submitExplain}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
                  >
                    Gửi giải trình
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplainOpen(false)}
                    className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
