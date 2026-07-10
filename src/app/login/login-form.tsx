"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <Input id="email" name="email" type="email" label="Email" required autoComplete="email" />
      <Input
        id="password"
        name="password"
        type="password"
        label="Mật khẩu"
        required
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" isLoading={pending}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
      <p className="text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-primary hover:text-primary-hover">
          Đăng ký ngay
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        Hoặc{" "}
        <Link href="/guest/announcements" className="font-medium text-primary hover:text-primary-hover">
          xem bản tin & khóa học công khai
        </Link>{" "}
        không cần đăng nhập
      </p>
    </form>
  );
}
