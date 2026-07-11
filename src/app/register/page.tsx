import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRegistrationEnabled } from "@/lib/access";
import { BrandLogo } from "@/components/brand-logo";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user && user.status === "ACTIVE") {
      redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
    }
  }

  const registrationEnabled = await isRegistrationEnabled();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo />
          <p className="mt-3 text-sm text-muted">Đăng ký tài khoản học viên</p>
        </div>
        {registrationEnabled ? (
          <RegisterForm />
        ) : (
          <div className="space-y-4 text-center">
            <p className="flex items-center justify-center gap-2 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Đăng ký hiện đang tạm khóa. Vui lòng quay lại sau.
            </p>
            <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-hover">
              Quay lại trang đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
