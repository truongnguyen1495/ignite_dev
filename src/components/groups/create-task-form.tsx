"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, BookOpen, Dumbbell, ClipboardList, MoreHorizontal, Lock, Users, AlertTriangle } from "lucide-react";
import type { DailyTaskCategory, DailyTaskFrequency } from "@prisma/client";
import {
  DAILY_TASK_CATEGORY_LABELS,
  ORDERED_DAILY_TASK_CATEGORIES,
  ORDERED_WEEKDAYS,
  WEEKDAY_LABELS,
  todayVN,
  type CreateDailyTaskInput,
} from "@/lib/groups";

const CATEGORY_ICONS: Record<DailyTaskCategory, typeof Phone> = {
  CALL: Phone,
  READING: BookOpen,
  EXERCISE: Dumbbell,
  NOTE: ClipboardList,
  OTHER: MoreHorizontal,
};

const FREQUENCY_OPTIONS: { value: DailyTaskFrequency; label: string; desc: string }[] = [
  { value: "ONCE", label: "Chỉ hôm nay", desc: "Nhiệm vụ một lần, không lặp lại" },
  { value: "DAILY", label: "Lặp lại mỗi ngày", desc: "Tự động giao lại mỗi ngày kể từ ngày bắt đầu" },
  { value: "WEEKLY_DAYS", label: "Lặp theo các thứ trong tuần", desc: "Chỉ giao vào những ngày được chọn" },
];

function todayISO(): string {
  const d = todayVN();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

// Who a task is being written for. Everything else about composing one —
// title, category, schedule, points, explanation rule — is identical whether
// it goes to a few people in one group or to every member of several groups,
// so the two live in one form rather than a copy that drifts.
export type TaskFormAudience =
  | {
      mode: "single";
      groupName: string;
      members: { id: string; name: string }[];
      action: (input: CreateDailyTaskInput) => Promise<string | undefined>;
    }
  | {
      mode: "bulk";
      groups: { id: string; name: string; memberCount: number; leaderName: string | null }[];
      preselectedGroupIds?: string[];
      action: (groupIds: string[], input: CreateDailyTaskInput) => Promise<string | undefined>;
    }
  // Editing a whole bulk assignment: the set of receiving groups is fixed
  // (changing it would mean creating and destroying copies, which is what
  // "giao việc hàng loạt" and "gỡ cả đợt" are for), so the audience section
  // becomes a read-only statement of who this reaches.
  | {
      mode: "locked";
      summary: string;
      action: (input: CreateDailyTaskInput) => Promise<string | undefined>;
    };

// Shared by the group's own LEADER/DEPUTY (/dashboard/my-group/tasks/new),
// an admin managing one group (/admin/groups/[groupId]/tasks/new) and an
// admin broadcasting to several (/admin/groups/assign) — the form itself
// doesn't care who's submitting, only `audience` (which Server Action to
// call, already bound to the right authorization, and who can receive)
// differs.
export function CreateTaskForm({
  audience,
  creatorName,
  successHref,
  initial,
  submitLabel,
}: {
  audience: TaskFormAudience;
  creatorName: string;
  successHref?: string;
  // Present when editing an existing task — the same form, pre-filled.
  initial?: CreateDailyTaskInput;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<DailyTaskCategory>(initial?.category ?? "CALL");
  const [audienceAll, setAudienceAll] = useState(initial?.audienceAll ?? true);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(initial?.memberIds ?? []));
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    () =>
      new Set(
        audience.mode === "bulk"
          ? // A group emptied between the list page render and this one would
            // otherwise arrive pre-ticked but un-submittable.
            (audience.preselectedGroupIds ?? []).filter((id) =>
              audience.groups.some((g) => g.id === id && g.memberCount > 0)
            )
          : []
      )
  );
  const [frequency, setFrequency] = useState<DailyTaskFrequency>(initial?.frequency ?? "DAILY");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set(initial?.weekdays ?? []));
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [dueTime, setDueTime] = useState(initial?.dueTime ?? "23:59");
  const [requireExplanation, setRequireExplanation] = useState(initial?.requireExplanation ?? true);
  const [points, setPoints] = useState(initial?.points ?? 10);

  const isBulk = audience.mode === "bulk";
  // Bulk composition and a bulk edit both describe an admin-authored task, so
  // both show the lock the group will see on it.
  const isAdminAuthored = audience.mode === "bulk" || audience.mode === "locked";
  const assignableGroups = audience.mode === "bulk" ? audience.groups.filter((g) => g.memberCount > 0) : [];
  const selectedMemberTotal =
    audience.mode === "bulk"
      ? audience.groups
          .filter((g) => selectedGroups.has(g.id))
          .reduce((sum, g) => sum + g.memberCount, 0)
      : 0;

  function submit() {
    setError(undefined);
    const shared = {
      title,
      description,
      category,
      frequency,
      weekdays: Array.from(weekdays),
      startDate,
      dueTime,
      requireExplanation,
      points,
    };
    startTransition(async () => {
      const err =
        audience.mode === "bulk"
          ? // Bulk always targets whole groups — see
            // validateAndBuildBulkDailyTaskData for why there's no member picker.
            await audience.action(Array.from(selectedGroups), {
              ...shared,
              audienceAll: true,
              memberIds: [],
            })
          : audience.mode === "locked"
            ? // The receiving groups can't change here; the action ignores
              // audience entirely (validateBulkDailyTaskEdit).
              await audience.action({ ...shared, audienceAll: true, memberIds: [] })
            : await audience.action({
                ...shared,
                audienceAll,
                memberIds: Array.from(selectedMembers),
              });
      if (err) {
        setError(err);
        return;
      }
      if (successHref) router.push(successHref);
    });
  }

  const PreviewIcon = CATEGORY_ICONS[category];
  const freqText =
    frequency === "ONCE"
      ? "Chỉ hôm nay"
      : frequency === "DAILY"
        ? "Lặp mỗi ngày"
        : weekdays.size > 0
          ? Array.from(weekdays)
              .sort((a, b) => a - b)
              .map((d) => WEEKDAY_LABELS[d])
              .join(", ")
          : "Theo thứ đã chọn";
  const audienceText =
    audience.mode === "bulk"
      ? selectedGroups.size === 0
        ? "Chưa chọn nhóm nào nhận nhiệm vụ"
        : `Áp dụng cho ${selectedMemberTotal} thành viên của ${selectedGroups.size} nhóm`
      : audience.mode === "locked"
        ? audience.summary
        : audienceAll
          ? `Áp dụng cho cả ${audience.members.length} thành viên ${audience.groupName}`
          : `Chỉ giao cho ${selectedMembers.size} thành viên được chọn`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div className="space-y-8 rounded-2xl border border-border bg-surface p-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Nội dung nhiệm vụ</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Gọi điện chăm sóc 5 khách hàng tiềm năng"
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Mô tả / hướng dẫn thêm <span className="font-normal text-muted">(không bắt buộc)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hướng dẫn chi tiết cho thành viên..."
              className="min-h-[76px] w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Danh mục</label>
            <div className="flex flex-wrap gap-2">
              {ORDERED_DAILY_TASK_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c];
                const selected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      selected ? "border-primary-border bg-primary-bg text-primary" : "border-border-strong text-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {DAILY_TASK_CATEGORY_LABELS[c]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {audience.mode === "bulk" ? (
          <section className="space-y-3 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Nhóm nhận nhiệm vụ</h3>
              {assignableGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedGroups((prev) =>
                      prev.size === assignableGroups.length
                        ? new Set()
                        : new Set(assignableGroups.map((g) => g.id))
                    )
                  }
                  className="text-xs font-bold text-primary"
                >
                  {selectedGroups.size === assignableGroups.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              )}
            </div>

            {audience.groups.length === 0 ? (
              <p className="text-sm text-muted">Chưa có nhóm nào để giao việc.</p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {audience.groups.map((group) => {
                  const isEmpty = group.memberCount === 0;
                  const checked = selectedGroups.has(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                        isEmpty
                          ? "cursor-not-allowed bg-warning-bg"
                          : `cursor-pointer hover:bg-surface-hover ${checked ? "bg-primary-bg" : ""}`
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isEmpty}
                        onChange={() => setSelectedGroups((prev) => toggleInSet(prev, group.id))}
                        className="accent-primary disabled:opacity-40"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-foreground">{group.name}</span>
                        <span className="block text-xs text-muted">
                          {group.leaderName ? `Trưởng nhóm: ${group.leaderName}` : "Chưa có trưởng nhóm"}
                        </span>
                      </span>
                      {isEmpty ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" /> Chưa có thành viên
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">{group.memberCount} thành viên</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                selectedGroups.size > 0 ? "border-primary-border bg-primary-bg-subtle" : "border-border text-muted"
              }`}
            >
              <Users className={`h-4 w-4 shrink-0 ${selectedGroups.size > 0 ? "text-primary" : "text-faint"}`} />
              {selectedGroups.size > 0 ? (
                <span>
                  <strong className="font-bold text-foreground">{selectedGroups.size} nhóm</strong> ·{" "}
                  <strong className="font-bold text-foreground">{selectedMemberTotal} thành viên</strong> sẽ nhận nhiệm
                  vụ này.
                </span>
              ) : (
                <span>Chọn ít nhất một nhóm để giao việc.</span>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-bg px-3 py-2.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <p className="text-xs text-foreground">
                Giao hàng loạt luôn áp dụng cho <strong className="font-bold">toàn bộ thành viên</strong> của nhóm được
                chọn — ai vào nhóm sau này cũng tự động nhận. Trưởng nhóm không sửa hay xoá được nhiệm vụ từ ban quản
                trị, nhưng vẫn tự giao nhiệm vụ riêng cho nhóm mình như bình thường. Muốn giao cho vài người cụ thể, hãy
                vào trang chi tiết của nhóm đó.
              </p>
            </div>
          </section>
        ) : audience.mode === "locked" ? (
          <section className="space-y-3 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground">Đối tượng nhận việc</h3>
            <div className="flex items-start gap-2.5 rounded-lg border border-primary-border bg-primary-bg-subtle px-3 py-2.5">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground">
                {audience.summary}
                <span className="mt-0.5 block text-xs text-muted">
                  Thay đổi ở đây áp dụng cho <strong className="font-semibold">tất cả</strong> các nhóm trong đợt. Muốn
                  thêm hoặc bớt nhóm nhận việc, hãy giao một đợt mới hoặc gỡ đợt này.
                </span>
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-3 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground">Đối tượng nhận việc</h3>
            <label
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                audienceAll ? "border-primary-border bg-primary-bg" : "border-border"
              }`}
            >
              <input type="radio" checked={audienceAll} onChange={() => setAudienceAll(true)} className="accent-primary" />
              <span>
                <span className="font-semibold text-foreground">Cả nhóm</span>
                <span className="block text-xs text-muted">
                  Áp dụng cho toàn bộ {audience.members.length} thành viên {audience.groupName}
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                !audienceAll ? "border-primary-border bg-primary-bg" : "border-border"
              }`}
            >
              <input type="radio" checked={!audienceAll} onChange={() => setAudienceAll(false)} className="accent-primary" />
              <span>
                <span className="font-semibold text-foreground">Chọn thành viên cụ thể</span>
                <span className="block text-xs text-muted">Chỉ giao cho một số người, ví dụ thành viên mới</span>
              </span>
            </label>
            {!audienceAll && (
              <div className="ml-1 mt-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {selectedMembers.size}/{audience.members.length} đã chọn
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMembers((prev) =>
                        prev.size === audience.members.length
                          ? new Set()
                          : new Set(audience.members.map((m) => m.id))
                      )
                    }
                    className="text-xs font-bold text-primary"
                  >
                    Chọn tất cả
                  </button>
                </div>
                <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border p-2">
                  {audience.members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(m.id)}
                        onChange={() => setSelectedMembers((prev) => toggleInSet(prev, m.id))}
                        className="accent-primary"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="space-y-3 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground">Lịch áp dụng</h3>
          {FREQUENCY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                frequency === opt.value ? "border-primary-border bg-primary-bg" : "border-border"
              }`}
            >
              <input type="radio" checked={frequency === opt.value} onChange={() => setFrequency(opt.value)} className="accent-primary" />
              <span>
                <span className="font-semibold text-foreground">{opt.label}</span>
                <span className="block text-xs text-muted">{opt.desc}</span>
              </span>
            </label>
          ))}
          {frequency === "WEEKLY_DAYS" && (
            <div className="ml-1 flex gap-1.5">
              {ORDERED_WEEKDAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWeekdays((prev) => toggleInSet(prev, d))}
                  className={`h-9 w-9 rounded-lg border text-xs font-bold ${
                    weekdays.has(d) ? "border-primary bg-primary text-primary-foreground" : "border-border-strong text-muted"
                  }`}
                >
                  {WEEKDAY_LABELS[d]}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Bắt đầu áp dụng từ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Hạn hoàn thành trong ngày</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground">Giải trình &amp; điểm thưởng</h3>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Bắt buộc giải trình nếu không hoàn thành</p>
              <p className="text-xs text-muted">Thành viên phải gửi lý do khi hết hạn mà chưa tick xong</p>
            </div>
            <button
              type="button"
              onClick={() => setRequireExplanation((v) => !v)}
              aria-pressed={requireExplanation}
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${requireExplanation ? "bg-primary" : "bg-faint-bg"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  requireExplanation ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Điểm thưởng khi hoàn thành</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 rounded-lg border border-border-strong bg-surface px-3 py-2 text-center text-sm font-bold text-foreground focus:border-primary focus:outline-none"
              />
              <span className="text-xs text-muted">điểm — cộng vào Điểm tích lũy dùng cho vòng quay may mắn mỗi tuần</span>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={pending || (isBulk && selectedGroups.size === 0)}
            onClick={submit}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "Đang lưu..."
              : submitLabel
                ? submitLabel
                : isBulk
                  ? `Giao cho ${selectedGroups.size} nhóm`
                  : "Lưu & giao việc"}
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Xem trước</p>
        <p className="text-xs text-muted">Trong &quot;Hoạt động hàng ngày&quot; của thành viên</p>
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-muted">Việc cần làm hôm nay</span>
            <span className="rounded-full border border-info-border bg-info-bg px-2 py-0.5 text-[10px] font-bold text-info">
              {freqText}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-border-strong" />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-bg text-primary">
              <PreviewIcon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {title || "Tiêu đề nhiệm vụ"}
                {isAdminAuthored && (
                  <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-bg px-2 py-0.5 align-middle text-[10px] font-bold text-primary">
                    <Lock className="h-2.5 w-2.5" /> Từ ban quản trị
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-faint">
                Giao bởi {creatorName} · Hạn {dueTime}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-accent-border bg-accent-bg px-2 py-0.5 text-[11px] font-bold text-accent-hover">
              +{points}đ
            </span>
          </div>
          <p className="mt-3 border-t border-dashed border-border pt-3 text-xs text-muted">{audienceText}</p>
        </div>
      </div>
    </div>
  );
}
