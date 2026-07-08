import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const HOTLINE = "1900 1415";

export default function AccountLockedPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo />
        </div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Tài khoản đã bị vô hiệu hóa</h1>
        <p className="mt-2 text-sm text-muted">
          Tài khoản của bạn đang bị vô hiệu hóa, vui lòng liên hệ admin theo hotline{" "}
          <a href={`tel:${HOTLINE.replace(/\s/g, "")}`} className="font-medium text-primary">
            {HOTLINE}
          </a>
          .
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
