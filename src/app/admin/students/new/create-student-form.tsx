"use client";

import { useActionState } from "react";
import { createStudentAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";

export function CreateStudentForm() {
  const [error, formAction, pending] = useActionState(createStudentAction, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Họ tên
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="grantedLevel" className="block text-sm font-medium mb-1">
          Cấp được cấp quyền
        </label>
        <select
          id="grantedLevel"
          name="grantedLevel"
          defaultValue={ORDERED_LEVELS[0]}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {ORDERED_LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Đang tạo..." : "Tạo học viên"}
      </button>
    </form>
  );
}
