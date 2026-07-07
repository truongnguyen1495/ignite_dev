"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "./actions";

export function SettingsForm({ passPercentage }: { passPercentage: number }) {
  const [error, formAction, pending] = useActionState(updateSettingsAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="passPercentage" className="mb-1.5 block text-sm font-medium text-foreground">
          Ngưỡng điểm đạt (%)
        </label>
        <input
          id="passPercentage"
          name="passPercentage"
          type="number"
          min={1}
          max={100}
          defaultValue={passPercentage}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Học viên đạt khi điểm bài test ≥ ngưỡng này. Áp dụng cho các lượt làm bài mới; lượt đã làm trước đó giữ nguyên kết quả.
        </p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang lưu..." : "Lưu cài đặt"}
      </button>
    </form>
  );
}
