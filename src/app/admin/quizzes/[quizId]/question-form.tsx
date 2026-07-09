"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type Action = (
  prevState: string | undefined,
  formData: FormData
) => Promise<string | undefined>;

export function QuestionForm({
  action,
  initialText,
  initialOptions,
}: {
  action: Action;
  initialText?: string;
  initialOptions?: { text: string; isCorrect: boolean }[];
}) {
  const [rows, setRows] = useState(
    initialOptions && initialOptions.length > 0
      ? initialOptions.map((o, i) => ({ key: `${i}`, text: o.text, isCorrect: o.isCorrect }))
      : [
          { key: "0", text: "", isCorrect: false },
          { key: "1", text: "", isCorrect: false },
        ]
  );
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Textarea id="text" name="text" defaultValue={initialText} required rows={3} label="Câu hỏi" />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Đáp án (tick vào ô vuông cho (các) đáp án đúng — có thể chọn nhiều)
        </p>
        {rows.map((row, i) => (
          <div key={row.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="optionCorrect"
              value={i}
              defaultChecked={row.isCorrect}
              className="h-4 w-4 accent-primary"
            />
            <input
              type="text"
              name="optionText"
              defaultValue={row.text}
              required
              placeholder={`Đáp án ${i + 1}`}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {rows.length > 2 && (
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                className="text-sm text-danger"
              >
                Xóa
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows([...rows, { key: crypto.randomUUID(), text: "", isCorrect: false }])
          }
          className="text-sm text-muted hover:text-foreground"
        >
          + Thêm đáp án
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang lưu..." : "Lưu câu hỏi"}
      </Button>
    </form>
  );
}
