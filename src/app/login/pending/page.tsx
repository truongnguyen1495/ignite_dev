import Link from "next/link";
import { Clock } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function AccountPendingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo />
        </div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-info-bg text-info">
          <Clock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Tài khoản đang chờ duyệt</h1>
        <p className="mt-2 text-sm text-muted">
          Tài khoản của bạn đã đăng ký thành công và đang chờ Super Admin phê duyệt. Vui lòng quay
          lại sau khi tài khoản được kích hoạt.
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
