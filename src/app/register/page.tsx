import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo />
          <p className="mt-3 text-sm text-muted">Đăng ký tài khoản học viên</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
