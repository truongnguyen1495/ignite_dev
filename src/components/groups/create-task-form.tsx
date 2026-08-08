"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, BookOpen, Dumbbell, ClipboardList, MoreHorizontal } from "lucide-react";
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

// Shared by the group's own LEADER/DEPUTY (/dashboard/my-group/tasks/new)
// and an admin managing any group (/admin/groups/[groupId]/tasks/new) — the
// form itself doesn't care who's submitting, only `action` (which Server
// Action to call, already bound to the right authorization) differs.
export function CreateTaskForm({
  members,
  groupName,
  creatorName,
  action,
  successHref,
}: {
  members: { id: string; name: string }[];
  groupName: string;
  creatorName: string;
  action: (input: CreateDailyTaskInput) => Promise<string | undefined>;
  successHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DailyTaskCategory>("CALL");
  const [audienceAll, setAudienceAll] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [frequency, setFrequency] = useState<DailyTaskFrequency>("DAILY");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState(todayISO());
  const [dueTime, setDueTime] = useState("23:59");
  const [requireExplanation, setRequireExplanation] = useState(true);
  const [points, setPoints] = useState(10);

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const err = await action({
        title,
        description,
        category,
        audienceAll,
        memberIds: Array.from(selectedMembers),
        frequency,
        weekdays: Array.from(weekdays),
        startDate,
        dueTime,
        requireExplanation,
        points,
      });
      if (err) {
        setError(err);
        return;
      }
      router.push(successHref);
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
  const audienceText = audienceAll
    ? `Áp dụng cho cả ${members.length} thành viên ${groupName}`
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
                Áp dụng cho toàn bộ {members.length} thành viên {groupName}
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
                  {selectedMembers.size}/{members.length} đã chọn
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMembers((prev) => (prev.size === members.length ? new Set() : new Set(members.map((m) => m.id))))
                  }
                  className="text-xs font-bold text-primary"
                >
                  Chọn tất cả
                </button>
              </div>
              <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border p-2">
                {members.map((m) => (
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
            disabled={pending}
            onClick={submit}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Đang lưu..." : "Lưu & giao việc"}
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Xem trước</p>
        <p className="text-xs text-muted">Trong &quot;Hoạt động hàng ngày&quot; của học viên</p>
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
              <p className="text-sm font-semibold text-foreground">{title || "Tiêu đề nhiệm vụ"}</p>
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
