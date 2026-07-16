"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signInWithGoogleAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function LoginForm({ googleLoginEnabled }: { googleLoginEnabled: boolean }) {
  const [error, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="w-full max-w-sm space-y-4">
      <form action={formAction} className="space-y-4">
        <Input id="email" name="email" type="email" label="Email" required autoComplete="email" />
        <Input
          id="password"
          name="password"
          type="password"
          label="Mật khẩu"
          required
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary-hover">
            Quên mật khẩu?
          </Link>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" isLoading={pending}>
          {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
      {googleLoginEnabled && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">hoặc</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithGoogleAction}>
            <Button type="submit" variant="outline" className="w-full">
              Đăng nhập bằng Google
            </Button>
          </form>
        </>
      )}
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
    </div>
  );
}
