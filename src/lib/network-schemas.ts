// Input validation for the Team Network Server Actions. Kept out of the
// "use server" file so it can be unit-tested: that file may only export async
// functions, and importing it needs a logged-in request.
//
// Every action re-validates here no matter what the browser already checked.
import { z } from "zod";
import type { Resolution } from "./network-import";

// "" and whitespace become null, so an emptied field clears the value.
const optionalText = (label: string, max: number) =>
  z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ?? "").trim() || null)
    .refine((v) => v === null || v.length <= max, `${label} tối đa ${max} ký tự.`);

const id = z.string().min(1);

const optionalId = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v || null);

export const networkStatusSchema = z.enum(["LEAD", "ACTIVE", "INACTIVE", "ZERO_PP", "CUSTOMER"]);

const memberFields = {
  name: z.string().trim().min(1, "Hãy nhập họ tên.").max(120, "Họ tên tối đa 120 ký tự."),
  igniteId: optionalText("RapidX ID", 20).transform((v) => (v ? v.toUpperCase() : null)),
  team: optionalText("Team", 60),
  leaderId: optionalId,
  referrerId: optionalId,
};

export const createMemberSchema = z.object({ ...memberFields, status: networkStatusSchema });

export const updateMemberSchema = z.object({ id, ...memberFields });

// A real calendar date: "2026-02-31" has the right shape but is not a day.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hiệu lực không hợp lệ.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Ngày hiệu lực không hợp lệ.");

export const changeStatusSchema = z.object({
  id,
  toStatus: networkStatusSchema,
  effectiveDate: isoDate,
  reason: optionalText("Lý do", 1000),
});

export const assignLeaderSchema = z.object({
  ids: z.array(id).min(1, "Hãy chọn ít nhất một thành viên.").max(500, "Chọn tối đa 500 người một lần."),
  leaderId: id,
});

const importRow = z.object({
  index: z.number().int().min(0),
  sourceRow: z.number().int().min(1),
  name: z.string().min(1).max(200),
  team: z.string().max(200).nullable(),
  igniteId: z.string().max(40).nullable(),
  statusRaw: z.string().max(100).nullable(),
  leaderRaw: z.string().max(200).nullable(),
  referrerRaw: z.string().max(200).nullable(),
});

const resolution: z.ZodType<Resolution> = z.union([
  z.object({ kind: z.literal("member"), target: z.string().min(1).max(200) }),
  z.object({ kind: z.literal("blank") }),
  z.object({ kind: z.literal("create") }),
]);

// The import is one INSERT per table, and Postgres caps a statement at 32,767 bound
// values. A statement split in two would also break rows that point at each other
// across the split, so the cap sits well under the point where that could happen.
export const MAX_IMPORT_ROWS = 2000;

export const commitImportSchema = z.object({
  rows: z.array(importRow).min(1, "Không có dòng nào để nhập.").max(MAX_IMPORT_ROWS, "Tối đa 2.000 dòng một lần."),
  resolutions: z.record(z.string(), resolution),
});

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}
