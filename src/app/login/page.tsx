import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGoogleLoginEnabled } from "@/lib/access";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; reset?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    // Don't trust the JWT's role/status alone — a locked account still has a
    // valid signed session until it expires. Re-check fresh from the DB so a
    // locked user lands on the login form (and fails to re-auth) instead of
    // bouncing back to a dashboard that will immediately redirect them here
    // again, forever.
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user && user.status === "ACTIVE") {
      redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
    }
  }

  const { verified, reset } = await searchParams;
  const googleLoginEnabled = await isGoogleLoginEnabled();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo />
          <p className="mt-3 text-sm text-muted">Đăng nhập để tiếp tục</p>
        </div>
        {verified === "1" && (
          <p className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Email đã được xác thực. Mời bạn đăng nhập.
          </p>
        )}
        {verified === "0" && (
          <p className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Liên kết xác thực không hợp lệ hoặc đã hết hạn.
          </p>
        )}
        {reset === "1" && (
          <p className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Mật khẩu đã được đặt lại. Mời bạn đăng nhập.
          </p>
        )}
        <LoginForm googleLoginEnabled={googleLoginEnabled} />
      </div>
    </div>
  );
}
