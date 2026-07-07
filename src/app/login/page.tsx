import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">LMS Nội Bộ</h1>
        <p className="text-sm text-zinc-500">Đăng nhập để tiếp tục</p>
      </div>
      <LoginForm />
    </div>
  );
}
