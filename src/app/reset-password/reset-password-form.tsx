"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetPasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(resetPasswordAction, undefined);
  const fieldErrors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <PasswordInput
        id="password"
        name="password"
        label="Mật khẩu mới"
        required
        minLength={8}
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự."
        error={fieldErrors.password}
      />
      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
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
