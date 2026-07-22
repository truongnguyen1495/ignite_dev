"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { changeOwnPasswordAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await changeOwnPasswordAction({ currentPassword, newPassword, confirmNewPassword });
      if (result) {
        setError(result);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccess(true);
      router.refresh();
    });
  }

  if (success) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        Đã đổi mật khẩu thành công.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="current-password"
        type="password"
        label="Mật khẩu hiện tại"
        required
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Input
        id="new-password"
        type="password"
        label="Mật khẩu mới"
        required
        minLength={8}
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự."
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input
        id="confirm-new-password"
        type="password"
        label="Xác nhận mật khẩu mới"
        required
        minLength={8}
        autoComplete="new-password"
        value={confirmNewPassword}
        onChange={(e) => setConfirmNewPassword(e.target.value)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        type="submit"
        isLoading={pending}
        disabled={!currentPassword || !newPassword || !confirmNewPassword}
      >
        {pending ? "Đang lưu..." : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
