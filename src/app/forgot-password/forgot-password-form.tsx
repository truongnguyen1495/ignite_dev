"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    undefined
  );

  if (state?.sent) {
    return (
      <div className="text-center">
        <p className="text-sm text-success">
          Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra
          hộp thư.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary-hover">
          Quay lại trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        hint="Nhập email đã dùng để đăng ký tài khoản."
        error={state?.fieldError}
      />
      <Button type="submit" className="w-full" isLoading={pending}>
        {pending ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu"}
      </Button>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Quay lại trang đăng nhập
        </Link>
      </p>
    </form>
  );
}
