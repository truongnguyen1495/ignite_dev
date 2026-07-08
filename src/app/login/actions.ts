"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, AccountLockedError, AccountPendingError } from "@/lib/auth";

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
    if (error instanceof AccountPendingError) {
      redirect("/login/pending");
    }
    if (error instanceof AuthError) {
      return "Email hoặc mật khẩu không đúng.";
    }
    throw error;
  }
}
