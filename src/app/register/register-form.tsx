"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export function RegisterForm() {
  const [error, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <form action={formAction} className="w-full space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>
          Họ và tên
        </label>
        <input id="name" name="name" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      <div>
        <label htmlFor="username" className={labelClass}>
          Username
        </label>
        <input id="username" name="username" required minLength={3} className={inputClass} />
      </div>
      <div>
        <label htmlFor="displayName" className={labelClass}>
          Tên hiển thị
        </label>
        <input id="displayName" name="displayName" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="dateOfBirth" className={labelClass}>
          Ngày tháng năm sinh
        </label>
        <input id="dateOfBirth" name="dateOfBirth" type="date" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Xác nhận mật khẩu
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang đăng ký..." : "Đăng ký"}
      </button>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
