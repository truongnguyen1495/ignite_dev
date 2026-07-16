import Link from "next/link";
import { MailWarning } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ResendVerificationForm } from "./resend-button";

export default async function EmailUnverifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo />
        </div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-bg text-warning">
          <MailWarning className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Email chưa được xác thực</h1>
        <p className="mt-2 text-sm text-muted">
          Tài khoản của bạn cần xác thực email trước khi đăng nhập. Kiểm tra hộp thư hoặc gửi lại liên kết
          bên dưới.
        </p>
        <div className="mt-6">
          <ResendVerificationForm initialEmail={email ?? ""} />
        </div>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary-hover"
        >
          Quay lại trang đăng nhập
        </Link>
      </div>
    </div>
  );
}
