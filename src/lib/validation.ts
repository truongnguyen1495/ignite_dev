import { z } from "zod";

// Vietnamese mobile numbers: local 10-digit form (0xxxxxxxxx) or
// international form (+84xxxxxxxxx), first significant digit one of
// 3/5/7/8/9 (the current VN mobile carrier prefixes).
export const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export const PHONE_NUMBER_ERROR =
  "Số điện thoại không hợp lệ. Định dạng: 0xxxxxxxxx hoặc +84xxxxxxxxx.";

// Stored/compared canonical form is always the local 0-prefixed form, so
// "+84912345678" and "0912345678" collide on the DB unique index instead of
// silently being treated as two different numbers.
export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("+84") ? "0" + trimmed.slice(3) : trimmed;
}

// Required variant — used by register and the student self-service page.
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(VN_PHONE_REGEX, PHONE_NUMBER_ERROR)
  .transform(normalizePhoneNumber);

// Optional variant — used by the two admin flows. Empty string (the value a
// blank form field submits) is normalized to `null` rather than kept as ""
// so it doesn't collide with every other blank submission on the unique
// index the way a literal "" string would.
export const optionalPhoneNumberSchema = z
  .union([phoneNumberSchema, z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .optional();
