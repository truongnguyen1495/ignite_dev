"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/next-path";
import { signIn, AccountLockedError, TooManyAttemptsError, EmailNotVerifiedError } from "@/lib/auth";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    // Where to land afterwards. Sanitised, never trusted: this value comes
    // from a query string and feeds signIn's redirectTo, so an unchecked
    // path here would be an open redirect on the login form itself.
    const next = sanitizeNextPath(formData.get("next")?.toString()) ?? "/";
    await signIn("credentials", {
      email,
      password,
      redirectTo: next,
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

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  // Same return path as the credentials form — otherwise choosing Google
  // silently drops whatever the visitor was in the middle of buying.
  const next = sanitizeNextPath(formData.get("next")?.toString()) ?? "/";
  await signIn("google", { redirectTo: next });
}
