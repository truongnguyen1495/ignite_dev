"use server";

import { Prisma } from "@prisma/client";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  NetworkError,
  loadNetworkMembers,
  assignLeaderTx,
  changeStatusTx,
  createMemberTx,
  deleteMemberTx,
  importMembersTx,
  loadMemberHistory,
  patchMemberTx,
  deleteMembersTx,
  type ImportResult,
  type StatusHistoryEntry,
} from "@/lib/network";
import { readImportFile, type ImportPreview } from "@/lib/network-import-read";
import type { NetworkMemberLite } from "@/lib/network-tree";
import {
  assignLeaderSchema,
  changeStatusSchema,
  commitImportSchema,
  createMemberSchema,
  firstIssue,
  patchMemberSchema,
  deleteMembersSchema,
  MAX_IMPORT_ROWS,
} from "@/lib/network-schemas";

// Every action here is gated on MANAGE_NETWORK and re-validates its own input:
// the browser's checks (greyed-out options, required fields) are conveniences,
// never the boundary. Results are plain objects — `{ error }` for something the
// admin can fix, data otherwise — the same shape the other admin actions use.

export type ActionResult<T> = (T & { error?: undefined }) | { error: string };

const TX = { maxWait: 10_000, timeout: 20_000 };

async function guarded<T>(work: () => Promise<T>): Promise<ActionResult<T extends object ? T : never>> {
  try {
    return (await work()) as ActionResult<T extends object ? T : never>;
  } catch (e) {
    if (e instanceof NetworkError) return { error: e.message };
    // Two admins saving the same RapidX ID at once: the unique index decides.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "RapidX ID này vừa được dùng cho người khác. Hãy kiểm tra lại." };
    }
    throw e;
  }
}

// The whole member list again, for "Làm mới" and after an import — the page
// holds the list in the browser and edits it optimistically, so this is how it
// gets back in step with the database.
export async function getNetworkMembersAction(): Promise<ActionResult<{ members: NetworkMemberLite[] }>> {
  await requireAdminPermission("MANAGE_NETWORK");
  return { members: await loadNetworkMembers() };
}

export async function createMemberAction(
  input: unknown
): Promise<ActionResult<{ member: NetworkMemberLite; entry: StatusHistoryEntry }>> {
  const admin = await requireAdminPermission("MANAGE_NETWORK");
  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  return guarded(() => prisma.$transaction((tx) => createMemberTx(tx, admin, parsed.data), TX));
}

// Saves only the fields that were sent (see patchMemberTx): the table edits one cell at a
// time and the form sends just what changed, so neither can overwrite a field that
// another admin changed meanwhile.
export async function patchMemberAction(input: unknown): Promise<ActionResult<{ member: NetworkMemberLite }>> {
  await requireAdminPermission("MANAGE_NETWORK");
  const parsed = patchMemberSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  return guarded(async () => ({ member: await prisma.$transaction((tx) => patchMemberTx(tx, parsed.data), TX) }));
}

export async function changeStatusAction(
  input: unknown
): Promise<ActionResult<{ member: NetworkMemberLite; entry: StatusHistoryEntry }>> {
  const admin = await requireAdminPermission("MANAGE_NETWORK");
  const parsed = changeStatusSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  // "YYYY-MM-DD" (already checked to be a real day) parses as UTC midnight,
  // which is exactly what the @db.Date column stores — same convention as the
  // finance ledger.
  const effectiveDate = new Date(`${parsed.data.effectiveDate}T00:00:00.000Z`);

  return guarded(() =>
    prisma.$transaction(
      (tx) => changeStatusTx(tx, admin, { id: parsed.data.id, toStatus: parsed.data.toStatus, effectiveDate, reason: parsed.data.reason }),
      TX
    )
  );
}

export async function assignLeaderAction(input: unknown): Promise<ActionResult<{ members: NetworkMemberLite[] }>> {
  await requireAdminPermission("MANAGE_NETWORK");
  const parsed = assignLeaderSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  return guarded(async () => ({
    members: await prisma.$transaction((tx) => assignLeaderTx(tx, [...new Set(parsed.data.ids)], parsed.data.leaderId), TX),
  }));
}

export async function deleteMemberAction(memberId: string): Promise<ActionResult<{ leaderChildren: number; referrals: number }>> {
  await requireAdminPermission("MANAGE_NETWORK");
  if (typeof memberId !== "string" || !memberId) return { error: "Thành viên không hợp lệ." };

  return guarded(() => prisma.$transaction((tx) => deleteMemberTx(tx, memberId), TX));
}

export async function deleteMembersAction(input: unknown): Promise<ActionResult<{ deleted: number; leaderChildren: number; referrals: number }>> {
  await requireAdminPermission("MANAGE_NETWORK");
  const parsed = deleteMembersSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  return guarded(() => prisma.$transaction((tx) => deleteMembersTx(tx, parsed.data.ids), TX));
}

// Loaded when the admin opens the history tab rather than with the page, so
// the page stays one query however much history piles up.
export async function getMemberHistoryAction(memberId: string): Promise<ActionResult<{ entries: StatusHistoryEntry[] }>> {
  await requireAdminPermission("MANAGE_NETWORK");
  if (typeof memberId !== "string" || !memberId) return { error: "Thành viên không hợp lệ." };
  return { entries: await loadMemberHistory(memberId) };
}

// Next caps a Server Action's request body at 1 MB by default, so a bigger file
// would fail with a message the admin cannot act on. A roster of thousands of
// rows is a few hundred KB as .xlsx, well inside this.
const MAX_IMPORT_BYTES = 900 * 1024;

// Step 1 of the import: read the .xlsx and hand the rows back. Nothing is
// written. The browser plans against its own copy of the member list and shows
// the preview; commitImportAction repeats the plan against the database.
export async function previewImportAction(formData: FormData): Promise<ActionResult<{ preview: ImportPreview }>> {
  await requireAdminPermission("MANAGE_NETWORK");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Hãy chọn một file Excel (.xlsx)." };
  if (!/\.xlsx$/i.test(file.name)) return { error: "Chỉ nhận file .xlsx. Hãy lưu file Excel ở định dạng .xlsx rồi chọn lại." };
  if (file.size > MAX_IMPORT_BYTES) return { error: "File quá lớn (tối đa 900 KB). Hãy bỏ bớt sheet không cần thiết rồi lưu lại." };

  let preview: ImportPreview;
  try {
    preview = await readImportFile(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { error: "Không đọc được file này. Hãy mở bằng Excel, lưu lại dạng .xlsx rồi chọn lại." };
  }

  if (preview.sheets.length === 0) {
    const hint = preview.unusable[0];
    return {
      error: hint
        ? `Không tìm thấy bảng danh sách hợp lệ. Sheet “${hint.name}” còn thiếu cột: ${hint.missingColumns.join(", ")}.`
        : "File không có dòng thành viên nào. Sheet cần có các cột Họ tên, Trạng thái và Leader.",
    };
  }
  // Said now, with the sheet's name, rather than as a bare limit message at commit.
  const tooBig = preview.sheets.find((s) => s.rows.length > MAX_IMPORT_ROWS);
  if (tooBig) {
    return { error: `Sheet “${tooBig.name}” có ${tooBig.rows.length} dòng, nhiều hơn mức tối đa ${MAX_IMPORT_ROWS.toLocaleString("vi-VN")} dòng một lần nhập. Hãy chia file thành nhiều file nhỏ hơn.` };
  }
  return { preview };
}

// Step 2: write. The rows come back from the browser, but they are only
// inputs to the planner — every rule is checked again here against the live
// database, and a stale or tampered request is refused as a whole.
export async function commitImportAction(input: unknown): Promise<ActionResult<{ result: ImportResult }>> {
  const admin = await requireAdminPermission("MANAGE_NETWORK");
  const parsed = commitImportSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  return guarded(async () => ({
    result: await prisma.$transaction((tx) => importMembersTx(tx, admin, parsed.data), { maxWait: 10_000, timeout: 60_000 }),
  }));
}
