"use client";

import { useId, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { parseTimestamp, parseTracklistText, type ParsedSegment } from "@/lib/course-lesson-segments";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none";

// Feeds a hidden JSON input inside the surrounding lesson <form> rather than
// owning its own — a lesson's segments are saved together with the rest of
// the lesson in one submit, not as a separate request. Shared by the admin
// and vendor lesson forms (both write to the same CourseLesson/
// CourseLessonSegment tables), unlike the two forms' own server actions,
// which stay deliberately duplicated for the vendor-ownership security
// boundary — this component has no such concern, it just emits JSON.
export function CourseLessonSegmentsEditor({ initialSegments }: { initialSegments: ParsedSegment[] }) {
  const [rows, setRows] = useState<ParsedSegment[]>(initialSegments);
  const [raw, setRaw] = useState("");
  const rawId = useId();
  const confirm = useConfirm();

  async function handleAnalyze() {
    const parsed = parseTracklistText(raw);
    if (parsed.length === 0) return;
    if (rows.length > 0) {
      const ok = await confirm({
        title: "Thay thế danh sách phân cảnh hiện tại?",
        description: `Đang có ${rows.length} dòng — phân tích sẽ xoá và thay bằng ${parsed.length} dòng vừa dán.`,
        confirmLabel: "Thay thế",
        tone: "danger",
      });
      if (!ok) return;
    }
    setRows(parsed);
  }

  // Three states per row, because the two bad ones fail very differently on
  // submit: an incomplete row is dropped from the payload entirely (silent
  // data loss without this warning), while a filled-but-malformed timestamp
  // reaches the server and rejects the WHOLE lesson save — title, video and
  // ghi chú along with it. Both are worth catching before the author submits.
  function rowState(row: ParsedSegment): "ok" | "incomplete" | "bad-time" {
    const time = row.time.trim();
    const label = row.label.trim();
    if (!time || !label) return "incomplete";
    return parseTimestamp(time) === null ? "bad-time" : "ok";
  }

  const incompleteCount = rows.filter((r) => rowState(r) === "incomplete").length;
  const badTimeCount = rows.filter((r) => rowState(r) === "bad-time").length;

  function updateRow(index: number, patch: Partial<ParsedSegment>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <label htmlFor={rawId} className="block flex-1 text-sm">
          <span className="mb-1.5 block font-medium text-foreground">Dán tracklist (tùy chọn)</span>
          <textarea
            id={rawId}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"00:00 Tên bài – Sáng tác: ...\n04:27 Tên bài – Sáng tác: ..."}
            rows={4}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
        </label>
        <Button type="button" variant="secondary" onClick={handleAnalyze}>
          <Wand2 className="h-4 w-4" />
          Phân tích
        </Button>
      </div>

      {rows.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="w-24 pb-1.5 pr-2">Mốc</th>
              <th className="pb-1.5">Tên bài / mô tả</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const state = rowState(row);
              return (
              <tr key={i}>
                <td className="py-1 pr-2 align-top">
                  <input
                    value={row.time}
                    onChange={(e) => updateRow(i, { time: e.target.value })}
                    placeholder="00:00"
                    aria-invalid={state === "bad-time"}
                    className={`${inputClass} font-mono ${state === "bad-time" ? "border-danger" : ""}`}
                  />
                </td>
                <td className="py-1 align-top">
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    placeholder="Tên bài"
                    maxLength={300}
                    className={inputClass}
                  />
                </td>
                <td className="py-1 pl-1 align-top">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label="Xoá dòng"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {badTimeCount > 0 && (
        <p className="text-xs text-danger">
          {badTimeCount} dòng có mốc thời gian không hợp lệ (đúng dạng <span className="font-mono">04:27</span> hoặc{" "}
          <span className="font-mono">1:04:27</span>). Sửa lại trước khi lưu, nếu không cả bài học sẽ không lưu được.
        </p>
      )}
      {incompleteCount > 0 && (
        <p className="text-xs text-warning">
          {incompleteCount} dòng còn thiếu mốc hoặc tên bài — những dòng này sẽ không được lưu.
        </p>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={() => setRows((prev) => [...prev, { time: "", label: "" }])}>
        <Plus className="h-4 w-4" />
        Thêm dòng
      </Button>

      <input type="hidden" name="segments" value={JSON.stringify(rows.filter((r) => r.time.trim() && r.label.trim()))} />
    </div>
  );
}
