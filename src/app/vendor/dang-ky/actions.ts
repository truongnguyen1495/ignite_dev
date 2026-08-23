"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveStudentOrNull, getVendorForUser, isEmailVerificationEnabled } from "@/lib/access";
import { DEFAULT_LEVEL } from "@/lib/levels";
import { phoneNumberSchema } from "@/lib/validation";
import { slugifyShopName } from "@/lib/vendor";
import { createEmailVerificationToken } from "@/lib/verification-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { allowByIp, MINUTE_MS } from "@/lib/rate-limit";

// Shared by both branches below — the checkboxes double as "what to show the
// admin reviewing the application" and (once approved) have no further
// enforcement, per the model's own comment.
const applicationSchema = z.object({
  shopName: z.string().trim().min(1, "Tên gian hàng không được để trống."),
  contactEmail: z.string().trim().email("Email không hợp lệ."),
  contactPhone: phoneNumberSchema,
  intendsProducts: z.boolean(),
  intendsCourses: z.boolean(),
  intendsLibraryItems: z.boolean(),
  bankName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankAccountHolder: z.string().trim().optional(),
  bio: z.string().trim().optional(),
});

// Only asked of a brand-new anonymous visitor (see the branch below) — an
// already-logged-in student's own account fields are left untouched, and
// contactEmail/contactPhone above become that account's *public storefront*
// contact, independent of login credentials.
const newAccountSchema = z.object({
  name: z.string().trim().min(1, "Họ tên người đại diện không được để trống."),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
});

export type VendorRegisterState = { error: string } | undefined;

// Generates rapidx.vn/shop/<slug>, retrying with a numeric suffix on a
// collision. Sequential single-row lookups, not a fan-out — this only ever
// runs once per application, so the extra round trips don't matter, and it
// keeps the connection_limit=1 pool to one query at a time exactly like
// every other write path in this app.
async function generateUniqueVendorSlug(shopName: string): Promise<string> {
  const base = slugifyShopName(shopName);
  let candidate = base;
  let attempt = 1;
  while (await prisma.vendor.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return candidate;
}

/**
 * One action handles both entry points the mockup's single form covers:
 * a brand-new anonymous visitor (creates a `User` + `Vendor` together) and an
 * already-logged-in active student (attaches a `Vendor` to their existing
 * `userId`, no new account). See VendorRegisterForm for how the rendered
 * fields differ between the two — this action re-derives which case it's in
 * from the session itself, never from a hidden form field, so a tampered
 * submission can't claim to be "already logged in" when it isn't or vice versa.
 */
export async function registerVendorAction(
  _prevState: VendorRegisterState,
  formData: FormData
): Promise<VendorRegisterState> {
  if (!(await allowByIp("vendor-register", 5, 10 * MINUTE_MS))) {
    return { error: "Bạn đã thử gửi hồ sơ quá nhiều lần. Vui lòng đợi vài phút rồi thử lại." };
  }

  const parsedApp = applicationSchema.safeParse({
    shopName: formData.get("shopName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    intendsProducts: formData.get("intendsProducts") === "on",
    intendsCourses: formData.get("intendsCourses") === "on",
    intendsLibraryItems: formData.get("intendsLibraryItems") === "on",
    bankName: formData.get("bankName") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    bankAccountHolder: formData.get("bankAccountHolder") || undefined,
    bio: formData.get("bio") || undefined,
  });
  if (!parsedApp.success) {
    return { error: parsedApp.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  if (!parsedApp.data.intendsProducts && !parsedApp.data.intendsCourses && !parsedApp.data.intendsLibraryItems) {
    return { error: "Vui lòng chọn ít nhất một loại hình bạn dự định bán." };
  }

  const existingStudent = await getActiveStudentOrNull();
  let userId: string;
  let isNewAccount = false;
  let verificationRequired = false;

  if (existingStudent) {
    // Re-checked here (not just on the page load) — the page already hides
    // the form when a Vendor row exists, but a direct POST replaying an old
    // form must not be able to attach a second Vendor to the same account.
    if (await getVendorForUser(existingStudent.id)) {
      redirect("/vendor/trang-thai");
    }
    userId = existingStudent.id;
  } else {
    const parsedAccount = newAccountSchema.safeParse({
      name: formData.get("name"),
      password: formData.get("password"),
    });
    if (!parsedAccount.success) {
      return { error: parsedAccount.error.issues[0]?.message ?? "Dữ liệu tài khoản không hợp lệ." };
    }

    const passwordHash = await bcrypt.hash(parsedAccount.data.password, 10);
    verificationRequired = await isEmailVerificationEnabled();

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: parsedAccount.data.name,
          email: parsedApp.data.contactEmail,
          phoneNumber: parsedApp.data.contactPhone,
          passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
          grantedLevel: DEFAULT_LEVEL,
          // Marks this as a sell-only account with no student dashboard — see
          // requireActiveStudent's own comment for the /vendor redirect this
          // triggers if this account is ever pointed at /dashboard.
          vendorOnly: true,
          emailVerified: verificationRequired ? null : new Date(),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = e.meta?.target;
        const fields = Array.isArray(target) ? target : [];
        if (fields.includes("phoneNumber")) {
          return { error: "Số điện thoại này đã được sử dụng cho một tài khoản khác." };
        }
        return { error: "Email này đã được sử dụng cho một tài khoản khác." };
      }
      throw e;
    }
    userId = user.id;
    isNewAccount = true;

    if (verificationRequired) {
      try {
        const token = await createEmailVerificationToken(user.id);
        if (token) {
          await sendVerificationEmail(user.email, token);
        }
      } catch (e) {
        // Same trade-off as register/actions.ts: the account (and now the
        // vendor application riding along with it) was still created — a
        // failed send shouldn't block either.
        console.error("Failed to send vendor verification email:", e);
      }
    }
  }

  const slug = await generateUniqueVendorSlug(parsedApp.data.shopName);
  try {
    await prisma.vendor.create({
      data: {
        userId,
        shopName: parsedApp.data.shopName,
        slug,
        contactEmail: parsedApp.data.contactEmail,
        contactPhone: parsedApp.data.contactPhone,
        bio: parsedApp.data.bio ?? null,
        bankName: parsedApp.data.bankName ?? null,
        bankAccountNumber: parsedApp.data.bankAccountNumber ?? null,
        bankAccountHolder: parsedApp.data.bankAccountHolder ?? null,
        intendsProducts: parsedApp.data.intendsProducts,
        intendsCourses: parsedApp.data.intendsCourses,
        intendsLibraryItems: parsedApp.data.intendsLibraryItems,
        applicationStatus: "PENDING",
      },
    });
  } catch (e) {
    // userId is @unique on Vendor — only reachable via a race against the
    // getVendorForUser check above (two tabs submitting at once), not the
    // ordinary case. Treat it the same as "already applied" rather than a
    // hard error.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect("/vendor/trang-thai");
    }
    throw e;
  }

  if (isNewAccount) {
    redirect(verificationRequired ? "/vendor/dang-ky/success?verify=1" : "/vendor/dang-ky/success");
  }
  redirect("/vendor/trang-thai");
}
