"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound } from "lucide-react";
import { setOwnPasswordAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function SetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await setOwnPasswordAction({ password, confirmPassword });
      if (result) {
        setError(result);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
      router.refresh();
    });
  }

  if (success) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        Đã đặt mật khẩu — giờ bạn có thể đăng nhập bằng email/mật khẩu bất cứ lúc nào, không chỉ qua Google.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="flex items-start gap-2 text-sm text-muted">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        Tài khoản của bạn đang chỉ đăng nhập được qua Google, chưa có mật khẩu riêng. Đặt mật khẩu để vẫn
        đăng nhập được nếu tính năng đăng nhập Google bị tắt sau này.
      </p>
      <Input
        id="new-password"
        type="password"
        label="Mật khẩu mới"
        required
        minLength={8}
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        id="confirm-new-password"
        type="password"
        label="Xác nhận mật khẩu mới"
        required
        minLength={8}
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" isLoading={pending} disabled={!password || !confirmPassword}>
        {pending ? "Đang lưu..." : "Đặt mật khẩu"}
      </Button>
    </form>
  );
}
