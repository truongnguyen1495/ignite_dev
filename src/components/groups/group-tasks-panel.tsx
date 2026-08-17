"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

export type TaskRow = {
  id: string;
  title: string;
  repeatLabel: string | null;
  startDateLabel: string;
  isLiveToday: boolean;
  audienceSize: number;
  doneCount: number;
  // Non-null when the task came from a "giao việc hàng loạt" run;
  // batchGroupCount is how many groups that run reached, this one included.
  batchId: string | null;
  batchGroupCount: number;
};

// The group's task list, shared by the admin tab (/admin/groups/[groupId])
// and the leader's own page (/dashboard/my-group/tasks). The two differ only
// in which Server Actions they hand over and whether admin-authored tasks are
// editable — so those are props, and the list itself has one implementation.
export function GroupTasksPanel({
  tasks,
  editHrefBase,
  deleteAction,
  deleteBatchAction,
  lockAdminTasks = false,
  emptyText,
}: {
  tasks: TaskRow[];
  // Row edit links are built as `${editHrefBase}/${task.id}/edit`.
  editHrefBase: string;
  deleteAction: (taskId: string) => Promise<string | undefined>;
  // Admin only — a leader never removes a whole batch.
  deleteBatchAction?: (batchId: string) => Promise<string | undefined>;
  // True for the leader view: tasks carrying a batchId are ban-quản-trị's and
  // read-only here (see isTaskManageableByLeadership).
  lockAdminTasks?: boolean;
  emptyText: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<TaskRow | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function remove(task: TaskRow, wholeBatch: boolean) {
    setError(undefined);
    startTransition(async () => {
      const err =
        wholeBatch && task.batchId && deleteBatchAction
          ? await deleteBatchAction(task.batchId)
          : await deleteAction(task.id);
      if (err) {
        setError(err);
        return;
      }
      setTarget(null);
      router.refresh();
    });
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted">{emptyText}</p>;
  }

  const canRemoveBatch = (task: TaskRow) =>
    !!task.batchId && task.batchGroupCount > 1 && !!deleteBatchAction;

  return (
    <div className="space-y-1">
      {tasks.map((task) => {
        const fromAdmin = task.batchId !== null;
        const readOnly = lockAdminTasks && fromAdmin;

        return (
          <div key={task.id} className="flex flex-wrap items-center gap-4 border-t border-border py-3 first:border-t-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {task.title}
                {fromAdmin && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-bg px-2 py-0.5 align-middle text-[10px] font-bold text-primary">
                    <Lock className="h-2.5 w-2.5" />
                    Từ ban quản trị
                    {task.batchGroupCount > 1 && ` · ${task.batchGroupCount} nhóm`}
                  </span>
                )}
                {task.repeatLabel && (
                  <span className="ml-2 rounded-full border border-info-border bg-info-bg px-2 py-0.5 text-[10px] font-bold text-info">
                    {task.repeatLabel}
                  </span>
                )}
                {!task.isLiveToday && (
                  <span className="ml-2 rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-bold text-faint">
                    Không áp dụng hôm nay
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-faint">
                Bắt đầu {task.startDateLabel}
                {readOnly && " · chỉ ban quản trị mới sửa hoặc gỡ được"}
              </p>
            </div>

            <div className="w-48 shrink-0">
              {task.isLiveToday ? (
                <>
                  <div className="h-1.5 overflow-hidden rounded-full bg-faint-bg">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${task.audienceSize ? Math.round((task.doneCount / task.audienceSize) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-muted">
                    {task.doneCount}/{task.audienceSize} hoàn thành hôm nay
                  </p>
                </>
              ) : (
                <p className="text-right text-xs text-muted">Đã hoàn thành {task.doneCount} lượt (tổng)</p>
              )}
            </div>

            {readOnly ? (
              <span className="flex h-8 w-[72px] shrink-0 items-center justify-center text-faint" aria-hidden="true">
                <Lock className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex w-[72px] shrink-0 items-center justify-end gap-1">
                <Link
                  href={`${editHrefBase}/${task.id}/edit`}
                  aria-label={`Sửa nhiệm vụ ${task.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setError(undefined);
                    setTarget(task);
                  }}
                  aria-label={`Gỡ nhiệm vụ ${task.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            )}
          </div>
        );
      })}

      {target && (
        <ModalShell onClose={() => setTarget(null)} labelledBy="remove-task-title">
          <h2 id="remove-task-title" className="text-base font-semibold text-foreground">
            Gỡ nhiệm vụ &ldquo;{target.title}&rdquo;?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Toàn bộ lịch sử hoàn thành và giải trình của nhiệm vụ này sẽ bị xoá theo. Thao tác không thể hoàn tác.
          </p>

          {canRemoveBatch(target) && (
            <p className="mt-3 rounded-lg border border-primary-border bg-primary-bg-subtle px-3 py-2.5 text-xs text-foreground">
              Nhiệm vụ này thuộc một đợt giao việc đã gửi tới{" "}
              <strong className="font-bold">{target.batchGroupCount} nhóm</strong>. Bạn có thể gỡ riêng bản của nhóm
              này, hoặc gỡ cả đợt ở mọi nhóm cùng lúc.
            </p>
          )}

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTarget(null)}>
              Hủy
            </Button>
            <Button type="button" variant="danger" isLoading={pending} onClick={() => remove(target, false)}>
              {canRemoveBatch(target) ? "Chỉ gỡ khỏi nhóm này" : "Gỡ nhiệm vụ"}
            </Button>
            {canRemoveBatch(target) && (
              <Button type="button" variant="danger" isLoading={pending} onClick={() => remove(target, true)}>
                Gỡ cả đợt ({target.batchGroupCount} nhóm)
              </Button>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
