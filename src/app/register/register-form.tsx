"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { registerAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

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
      <Input id="name" name="name" label="Họ và tên" required />
      <Input id="email" name="email" type="email" label="Email" required autoComplete="email" />
      <Input id="username" name="username" label="Username" required minLength={3} />
      <Input
        id="phoneNumber"
        name="phoneNumber"
        type="tel"
        label="Số điện thoại"
        required
        placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
      />
      <Input id="dateOfBirth" name="dateOfBirth" type="date" label="Ngày tháng năm sinh" required />
      <PasswordField id="password" name="password" label="Mật khẩu" autoComplete="new-password" />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" isLoading={pending}>
        {pending ? "Đang đăng ký..." : "Đăng ký"}
      </Button>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
