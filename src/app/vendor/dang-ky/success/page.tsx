import Link from "next/link";
import { CheckCircle2, MailCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

// Mirrors register/success/page.tsx's shape exactly — this is the landing
// spot for the brand-new-account branch of registerVendorAction only; an
// already-logged-in student who just applied skips this and goes straight to
// /vendor/trang-thai (they don't need a "go log in" step).
export default async function VendorRegisterSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const { verify } = await searchParams;
  const needsVerification = verify === "1";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo />
        </div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
          {needsVerification ? <MailCheck className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Đã gửi hồ sơ đăng ký</h1>
        <p className="mt-2 text-sm text-muted">
          {needsVerification
            ? "Vui lòng kiểm tra hộp thư email và bấm vào liên kết xác thực để kích hoạt tài khoản trước khi đăng nhập."
            : "Tài khoản của bạn đã sẵn sàng."}{" "}
          Đội ngũ RapidX sẽ xét duyệt hồ sơ gian hàng trong 1–2 ngày làm việc.
        </p>
        <Link
          href="/login?next=/vendor/trang-thai"
          className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary-hover"
        >
          Đăng nhập để xem trạng thái hồ sơ
        </Link>
      </div>
    </div>
  );
}
