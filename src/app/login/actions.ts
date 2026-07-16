"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, AccountLockedError, TooManyAttemptsError, EmailNotVerifiedError } from "@/lib/auth";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AccountLockedError) {
      redirect("/login/locked");
    }
    if (error instanceof EmailNotVerifiedError) {
      const query = typeof email === "string" ? `?email=${encodeURIComponent(email)}` : "";
      redirect(`/login/unverified${query}`);
    }
    if (error instanceof TooManyAttemptsError) {
      return "Tài khoản tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau khoảng 15 phút.";
    }
    if (error instanceof AuthError) {
      return "Email hoặc mật khẩu không đúng.";
    }
    throw error;
  }
}

export async function signInWithGoogleAction(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}
