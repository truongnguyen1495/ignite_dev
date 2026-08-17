"use client";

import { useState } from "react";
import { Layers, Users } from "lucide-react";
import type { CreateDailyTaskInput } from "@/lib/groups";
import { CreateTaskForm } from "@/components/groups/create-task-form";
import { adminUpdateDailyTaskAction, updateTaskBatchAction } from "../../../../actions";

// Editing a task that arrived as part of a bulk assignment poses a question
// no other edit screen has: change this group's copy, or every group's? The
// choice lives here rather than inside CreateTaskForm because it only decides
// which Server Action the form submits to — and, when it's the whole batch,
// that the audience section turns read-only (a batch always targets whole
// groups; adding or removing groups is a new assignment, not an edit).
export function AdminEditTaskForm({
  groupId,
  taskId,
  groupName,
  members,
  creatorName,
  initial,
  batchId,
  batchGroupCount,
}: {
  groupId: string;
  taskId: string;
  groupName: string;
  members: { id: string; name: string }[];
  creatorName: string;
  initial: CreateDailyTaskInput;
  batchId: string | null;
  batchGroupCount: number;
}) {
  const offersBatchScope = batchId !== null && batchGroupCount > 1;
  const [applyToBatch, setApplyToBatch] = useState(false);
  const editingBatch = offersBatchScope && applyToBatch;

  return (
    <div className="space-y-5">
      {offersBatchScope && (
        <fieldset className="rounded-2xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">Phạm vi thay đổi</legend>
          <p className="mb-3 text-xs text-muted">
            Nhiệm vụ này thuộc một đợt giao việc đã gửi tới {batchGroupCount} nhóm.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                !applyToBatch ? "border-primary-border bg-primary-bg" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="edit-scope"
                checked={!applyToBatch}
                onChange={() => setApplyToBatch(false)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Users className="h-3.5 w-3.5" /> Chỉ nhóm {groupName}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Các nhóm khác trong đợt giữ nguyên nội dung cũ
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                applyToBatch ? "border-primary-border bg-primary-bg" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="edit-scope"
                checked={applyToBatch}
                onChange={() => setApplyToBatch(true)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Layers className="h-3.5 w-3.5" /> Cả đợt · {batchGroupCount} nhóm
                </span>
                <span className="mt-0.5 block text-xs text-muted">Sửa một lần, mọi nhóm cập nhật theo</span>
              </span>
            </label>
          </div>
        </fieldset>
      )}

      <CreateTaskForm
        // Remount when the scope flips: the two branches collect different
        // audience state, and carrying a stale member selection from the
        // single-group branch into a batch edit would be misleading.
        key={editingBatch ? "batch" : "single"}
        audience={
          editingBatch && batchId
            ? {
                mode: "locked",
                summary: `Áp dụng cho toàn bộ thành viên của ${batchGroupCount} nhóm trong đợt giao việc này.`,
                action: updateTaskBatchAction.bind(null, groupId, batchId),
              }
            : {
                mode: "single",
                groupName,
                members,
                action: adminUpdateDailyTaskAction.bind(null, groupId, taskId),
              }
        }
        creatorName={creatorName}
        initial={initial}
        submitLabel={editingBatch ? `Lưu cho cả ${batchGroupCount} nhóm` : "Lưu thay đổi"}
        successHref={`/admin/groups/${groupId}`}
      />
    </div>
  );
}
