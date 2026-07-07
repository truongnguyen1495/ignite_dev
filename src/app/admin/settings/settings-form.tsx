"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "./actions";

export function SettingsForm({ passPercentage }: { passPercentage: number }) {
  const [error, formAction, pending] = useActionState(updateSettingsAction, undefined);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <label htmlFor="passPercentage" className="block text-sm font-medium mb-1">
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
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Học viên đạt khi điểm bài test ≥ ngưỡng này. Áp dụng cho các lượt làm bài mới; lượt đã làm trước đó giữ nguyên kết quả.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Đang lưu..." : "Lưu cài đặt"}
      </button>
    </form>
  );
}
