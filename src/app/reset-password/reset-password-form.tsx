"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetPasswordState } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(resetPasswordAction, undefined);
  const fieldErrors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Input
        id="password"
        name="password"
        type="password"
        label="Mật khẩu mới"
        required
        minLength={8}
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự."
        error={fieldErrors.password}
      />
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Xác nhận mật khẩu mới"
        required
        minLength={8}
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />
      <Button type="submit" className="w-full" isLoading={pending}>
        {pending ? "Đang lưu..." : "Đặt lại mật khẩu"}
      </Button>
    </form>
  );
}
