"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, signInWithGoogleAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

// Uncontrolled counterpart to register-form.tsx's PasswordField — this form
// submits via a plain server action (no React state needed for the value),
// so only the show/hide toggle needs local state.
function PasswordInput({
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
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
    </div>
  );
}

export function LoginForm({ googleLoginEnabled }: { googleLoginEnabled: boolean }) {
  const [error, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="w-full max-w-sm space-y-4">
      <form action={formAction} className="space-y-4">
        <Input id="email" name="email" type="email" label="Email" required autoComplete="email" />
        <PasswordInput id="password" name="password" label="Mật khẩu" autoComplete="current-password" />
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
