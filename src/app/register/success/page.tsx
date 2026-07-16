import Link from "next/link";
import { CheckCircle2, MailCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default async function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const { verify } = await searchParams;
  const needsVerification = verify === "1";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo />
        </div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
          {needsVerification ? <MailCheck className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Đăng ký thành công</h1>
        <p className="mt-2 text-sm text-muted">
          {needsVerification
            ? "Vui lòng kiểm tra hộp thư email và bấm vào liên kết xác thực để kích hoạt tài khoản trước khi đăng nhập."
            : "Tài khoản của bạn đã sẵn sàng — bạn có thể đăng nhập ngay bây giờ."}
        </p>
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
