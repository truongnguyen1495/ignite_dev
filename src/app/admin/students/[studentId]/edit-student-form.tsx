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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
          Họ tên
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
          Mật khẩu mới (để trống nếu không đổi)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="grantedLevel" className="mb-1.5 block text-sm font-medium text-foreground">
          Cấp được cấp quyền
        </label>
        <select
          id="grantedLevel"
          name="grantedLevel"
          defaultValue={grantedLevel}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          {ORDERED_LEVELS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
