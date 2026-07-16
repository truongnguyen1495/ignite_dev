import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Read-only check for the initial render — the actual mutation re-validates
  // the token again inside resetPasswordAction, since it could expire or get
  // consumed between this render and the form submit.
  const record = token
    ? await prisma.passwordResetToken.findUnique({ where: { token } })
    : null;
  const valid = !!record && record.expiresAt > new Date();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo />
          <p className="mt-3 text-sm text-muted">Đặt lại mật khẩu</p>
        </div>
        {valid && token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="flex items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </p>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-hover">
              Yêu cầu liên kết mới
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
