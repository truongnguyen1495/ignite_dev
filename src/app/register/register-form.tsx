"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { registerAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

function PasswordField({
  id,
  name,
  label,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [error, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <form action={formAction} className="w-full space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>
          Họ và tên
        </label>
        <input id="name" name="name" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="username" className={labelClass}>
          Username
        </label>
        <input
          id="username"
          name="username"
          required
          minLength={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="phoneNumber" className={labelClass}>
          Số điện thoại
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          required
          placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="dateOfBirth" className={labelClass}>
          Ngày tháng năm sinh
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <PasswordField id="password" name="password" label="Mật khẩu" autoComplete="new-password" />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        autoComplete="new-password"
      />
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
