"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { changeOwnPasswordAction } from "./actions";
import { Button } from "@/components/ui/button";

// Controlled counterpart to login-form.tsx's uncontrolled PasswordInput —
// this form already tracks each field's value in state (needed to disable
// the submit button until all three are filled), so the eye toggle reuses
// that same value/onChange pair instead of managing its own.
function PasswordField({
  id,
  label,
  autoComplete,
  hint,
  minLength,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  hint?: string;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 pr-10 text-base sm:text-sm text-foreground focus:border-primary focus:outline-none"
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
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

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
      <PasswordField
        id="current-password"
        label="Mật khẩu hiện tại"
        autoComplete="current-password"
        value={currentPassword}
        onChange={setCurrentPassword}
      />
      <PasswordField
        id="new-password"
        label="Mật khẩu mới"
        autoComplete="new-password"
        minLength={8}
        hint="Ít nhất 8 ký tự."
        value={newPassword}
        onChange={setNewPassword}
      />
      <PasswordField
        id="confirm-new-password"
        label="Xác nhận mật khẩu mới"
        autoComplete="new-password"
        minLength={8}
        value={confirmNewPassword}
        onChange={setConfirmNewPassword}
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
