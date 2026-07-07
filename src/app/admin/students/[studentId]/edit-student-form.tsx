"use client";

import { useActionState } from "react";
import { updateStudentAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import type { Level } from "@prisma/client";

export function EditStudentForm({
  studentId,
  name,
  email,
  grantedLevel,
}: {
  studentId: string;
  name: string;
  email: string;
  grantedLevel: Level;
}) {
  const [error, formAction, pending] = useActionState(updateStudentAction, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <input type="hidden" name="studentId" value={studentId} />
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Họ tên
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
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
          defaultValue={email}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Mật khẩu mới (để trống nếu không đổi)
        </label>
        <input
          id="password"
          name="password"
          type="password"
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
          defaultValue={grantedLevel}
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
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
