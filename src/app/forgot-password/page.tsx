import { BrandLogo } from "@/components/brand-logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo />
          <p className="mt-3 text-sm text-muted">Quên mật khẩu</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
