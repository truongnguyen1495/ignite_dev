import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateOnlyISOString } from "@/lib/date";
import { todayVN } from "@/lib/groups";
import { NETWORK_STATUS_CONFIG, NETWORK_STATUS_NEEDS_REASON, type NetworkStatus } from "@/lib/network-status";
import { isValidIgniteId, type NetworkMemberLite } from "@/lib/network-tree";
import { planImport, type ImportRow, type Resolution } from "@/lib/network-import";
import type { MemberPatchInput } from "@/lib/network-schemas";

// Server-side data access for Team Network. Every write takes a transaction
// client so the caller decides the boundary: a Server Action wraps one call in
// prisma.$transaction, and a verification script can wrap the same call in a
// transaction it rolls back.
//
// The database has a single pooled connection (see DATABASE_URL), so inside a
// transaction callback ONLY the `tx` client may be used — a stray `prisma.`
// call waits forever for the connection the transaction is holding.

type Tx = Prisma.TransactionClient;

export type StatusHistoryEntry = {
  id: string;
  fromStatus: NetworkStatus | null;
  toStatus: NetworkStatus;
  reason: string | null;
  /** YYYY-MM-DD */
  effectiveDate: string;
  changedByName: string;
  createdAt: string;
};

// A validation failure meant for the admin's eyes. Actions turn it into
// `{ error }`; anything else is a real bug and is left to throw.
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

type Admin = { id: string; name: string };

const MEMBER_SELECT = {
  id: true,
  name: true,
  igniteId: true,
  status: true,
  team: true,
  isRoot: true,
  leaderId: true,
  referrerId: true,
} satisfies Prisma.NetworkMemberSelect;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// The whole network as one flat list — a single query, never a query per
// level. The tree is rebuilt from leaderId / referrerId in the browser, so
// moving someone never means rewriting a stored tree.
export async function loadNetworkMembers(): Promise<NetworkMemberLite[]> {
  return prisma.networkMember.findMany({ select: MEMBER_SELECT });
}

function toHistoryEntry(row: {
  id: string;
  fromStatus: NetworkStatus | null;
  toStatus: NetworkStatus;
  reason: string | null;
  effectiveDate: Date;
  changedByName: string;
  createdAt: Date;
}): StatusHistoryEntry {
  return {
    id: row.id,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reason: row.reason,
    effectiveDate: toDateOnlyISOString(row.effectiveDate),
    changedByName: row.changedByName,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadMemberHistory(memberId: string): Promise<StatusHistoryEntry[]> {
  const rows = await prisma.networkMemberStatusHistory.findMany({
    where: { memberId },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toHistoryEntry);
}

// ---------------------------------------------------------------------------
// Guards shared by the writes
// ---------------------------------------------------------------------------

// One writer at a time may change the tree. Without this, two admins could
// each make a change that is fine on its own and form a loop together: A is
// made B's leader while B is made A's leader, each transaction having checked
// against data that did not yet contain the other's change. The lock is
// released automatically when the transaction ends.
async function lockNetwork(tx: Tx): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('network_member_tree'))`;
}

// The id plus every ancestor above it along one relationship, in a single
// recursive query. Used to refuse a loop on the server regardless of what the
// browser's own check allowed.
async function ancestorsOf(tx: Tx, relation: "leader" | "referrer", id: string): Promise<Set<string>> {
  const rows =
    relation === "leader"
      ? await tx.$queryRaw<{ id: string }[]>`
          WITH RECURSIVE up AS (
            SELECT "id", "leaderId" FROM "NetworkMember" WHERE "id" = ${id}
            UNION
            SELECT m."id", m."leaderId" FROM "NetworkMember" m JOIN up ON m."id" = up."leaderId"
          )
          SELECT "id" FROM up`
      : await tx.$queryRaw<{ id: string }[]>`
          WITH RECURSIVE up AS (
            SELECT "id", "referrerId" FROM "NetworkMember" WHERE "id" = ${id}
            UNION
            SELECT m."id", m."referrerId" FROM "NetworkMember" m JOIN up ON m."id" = up."referrerId"
          )
          SELECT "id" FROM up`;
  return new Set(rows.map((r) => r.id));
}

async function assertNoCycle(tx: Tx, relation: "leader" | "referrer", memberId: string, newParentId: string): Promise<void> {
  if (newParentId === memberId) {
    throw new NetworkError(
      relation === "leader" ? "Một người không thể là Leader của chính mình." : "Một người không thể tự giới thiệu chính mình."
    );
  }
  const ancestors = await ancestorsOf(tx, relation, newParentId);
  if (ancestors.has(memberId)) {
    throw new NetworkError(
      relation === "leader"
        ? "Không lưu được: người này đang nằm dưới thành viên, chọn làm Leader sẽ tạo vòng lặp."
        : "Không lưu được: người này đang nằm dưới thành viên trong cây giới thiệu, chọn sẽ tạo vòng lặp."
    );
  }
}

async function assertExists(tx: Tx, id: string, what: string): Promise<void> {
  const found = await tx.networkMember.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new NetworkError(`${what} không còn tồn tại. Hãy tải lại trang.`);
}

async function assertIgniteIdFree(tx: Tx, igniteId: string | null, exceptId: string | null): Promise<void> {
  if (!igniteId) return;
  if (!isValidIgniteId(igniteId)) throw new NetworkError("RapidX ID phải có dạng DIA + 7 chữ số, ví dụ DIA1234567.");
  const owner = await tx.networkMember.findUnique({ where: { igniteId }, select: { id: true, name: true } });
  if (owner && owner.id !== exceptId) throw new NetworkError(`RapidX ID ${igniteId} đã thuộc về ${owner.name}.`);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type MemberFields = {
  name: string;
  igniteId: string | null;
  team: string | null;
  leaderId: string | null;
  referrerId: string | null;
};

export async function createMemberTx(
  tx: Tx,
  admin: Admin,
  input: MemberFields & { status: NetworkStatus }
): Promise<{ member: NetworkMemberLite; entry: StatusHistoryEntry }> {
  await lockNetwork(tx);
  await assertIgniteIdFree(tx, input.igniteId, null);

  // A network that starts empty has no root, and without one every member would
  // sit in UNASSIGNED with nobody to be assigned under. So the first member
  // added becomes the root (the top Lead) and has no leader.
  const becomesRoot = (await tx.networkMember.count({ where: { isRoot: true } })) === 0;
  const leaderId = becomesRoot ? null : input.leaderId;
  if (leaderId) await assertExists(tx, leaderId, "Leader");
  if (input.referrerId) await assertExists(tx, input.referrerId, "Người giới thiệu");

  const member = await tx.networkMember.create({
    data: {
      name: input.name,
      igniteId: input.igniteId,
      status: input.status,
      team: input.team,
      isRoot: becomesRoot,
      leaderId,
      referrerId: input.referrerId,
    },
    select: MEMBER_SELECT,
  });
  const entry = await tx.networkMemberStatusHistory.create({
    data: {
      memberId: member.id,
      fromStatus: null,
      toStatus: input.status,
      reason: "Tạo thủ công",
      effectiveDate: todayVN(),
      changedById: admin.id,
      changedByName: admin.name,
    },
  });
  return { member, entry: toHistoryEntry(entry) };
}

export async function updateMemberTx(tx: Tx, id: string, input: MemberFields): Promise<NetworkMemberLite> {
  await lockNetwork(tx);
  const current = await tx.networkMember.findUnique({ where: { id }, select: MEMBER_SELECT });
  if (!current) throw new NetworkError("Thành viên không còn tồn tại. Hãy tải lại trang.");

  if (current.isRoot && input.leaderId) {
    throw new NetworkError("Gốc mạng lưới đứng trên cùng nên không có Leader.");
  }
  await assertIgniteIdFree(tx, input.igniteId, id);

  if (input.leaderId && input.leaderId !== current.leaderId) {
    await assertExists(tx, input.leaderId, "Leader");
    await assertNoCycle(tx, "leader", id, input.leaderId);
  }
  if (input.referrerId && input.referrerId !== current.referrerId) {
    await assertExists(tx, input.referrerId, "Người giới thiệu");
    await assertNoCycle(tx, "referrer", id, input.referrerId);
  }

  return tx.networkMember.update({
    where: { id },
    data: {
      name: input.name,
      igniteId: input.igniteId,
      team: input.team,
      leaderId: input.leaderId,
      referrerId: input.referrerId,
    },
    select: MEMBER_SELECT,
  });
}

// Applies only the fields in `patch` to the row as it is now, then runs the same checks
// as a full edit (RapidX ID shape and owner, loops, the root having no leader). The
// merge happens inside the transaction, under the lock, so a stale browser cannot put
// back a field that someone else changed in the meantime.
export async function patchMemberTx(tx: Tx, patch: MemberPatchInput): Promise<NetworkMemberLite> {
  await lockNetwork(tx);
  const current = await tx.networkMember.findUnique({ where: { id: patch.id }, select: MEMBER_SELECT });
  if (!current) throw new NetworkError("Thành viên không còn tồn tại. Hãy tải lại trang.");
  return updateMemberTx(tx, patch.id, {
    name: patch.name ?? current.name,
    igniteId: patch.igniteId !== undefined ? patch.igniteId : current.igniteId,
    team: patch.team !== undefined ? patch.team : current.team,
    leaderId: patch.leaderId !== undefined ? patch.leaderId : current.leaderId,
    referrerId: patch.referrerId !== undefined ? patch.referrerId : current.referrerId,
  });
}

export async function changeStatusTx(
  tx: Tx,
  admin: Admin,
  input: { id: string; toStatus: NetworkStatus; effectiveDate: Date; reason: string | null }
): Promise<{ member: NetworkMemberLite; entry: StatusHistoryEntry }> {
  await lockNetwork(tx);
  const current = await tx.networkMember.findUnique({ where: { id: input.id }, select: MEMBER_SELECT });
  if (!current) throw new NetworkError("Thành viên không còn tồn tại. Hãy tải lại trang.");
  if (current.status === input.toStatus) {
    throw new NetworkError(`Thành viên đã ở trạng thái ${NETWORK_STATUS_CONFIG[input.toStatus].label}.`);
  }
  if (NETWORK_STATUS_NEEDS_REASON[input.toStatus] && !input.reason) {
    throw new NetworkError(`Hãy nhập lý do khi chuyển sang ${NETWORK_STATUS_CONFIG[input.toStatus].label}.`);
  }
  if (input.effectiveDate.getTime() > todayVN().getTime()) {
    throw new NetworkError("Ngày hiệu lực không được ở tương lai.");
  }
  // A back-dated change that lands before the previous one would leave the
  // timeline reading in a different order from the current status.
  const latest = await tx.networkMemberStatusHistory.findFirst({
    where: { memberId: input.id },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
    select: { effectiveDate: true },
  });
  if (latest && input.effectiveDate.getTime() < latest.effectiveDate.getTime()) {
    throw new NetworkError(`Ngày hiệu lực không được sớm hơn lần đổi gần nhất (${toDateOnlyISOString(latest.effectiveDate)}).`);
  }

  const member = await tx.networkMember.update({ where: { id: input.id }, data: { status: input.toStatus }, select: MEMBER_SELECT });
  const entry = await tx.networkMemberStatusHistory.create({
    data: {
      memberId: input.id,
      fromStatus: current.status,
      toStatus: input.toStatus,
      reason: input.reason,
      effectiveDate: input.effectiveDate,
      changedById: admin.id,
      changedByName: admin.name,
    },
  });
  return { member, entry: toHistoryEntry(entry) };
}

// Gives several members the same leader in one go (the UNASSIGNED panel).
// Moving a group under L closes a loop exactly when L is one of them or sits
// below one of them, so checking L's ancestors once covers the whole batch.
export async function assignLeaderTx(tx: Tx, ids: string[], leaderId: string): Promise<NetworkMemberLite[]> {
  await lockNetwork(tx);
  await assertExists(tx, leaderId, "Leader");

  const targets = await tx.networkMember.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, isRoot: true } });
  if (targets.length !== new Set(ids).size) throw new NetworkError("Một số thành viên không còn tồn tại. Hãy tải lại trang.");
  if (targets.some((t) => t.isRoot)) throw new NetworkError("Gốc mạng lưới không có Leader.");

  const ancestors = await ancestorsOf(tx, "leader", leaderId);
  const looped = targets.find((t) => ancestors.has(t.id));
  if (looped) {
    throw new NetworkError(`Không gán được: ${looped.name} đang ở trên hoặc chính là Leader được chọn, gán sẽ tạo vòng lặp.`);
  }

  await tx.networkMember.updateMany({ where: { id: { in: ids } }, data: { leaderId } });
  return tx.networkMember.findMany({ where: { id: { in: ids } }, select: MEMBER_SELECT });
}

// People below the deleted member are not deleted: the foreign keys set their
// leaderId / referrerId to null (see NetworkMember in schema.prisma), which
// puts the downline in UNASSIGNED. Returns how many that affected so the
// confirmation the admin saw matches what happened.
export async function deleteMemberTx(tx: Tx, id: string): Promise<{ leaderChildren: number; referrals: number }> {
  await lockNetwork(tx);
  const current = await tx.networkMember.findUnique({ where: { id }, select: { id: true, isRoot: true } });
  if (!current) throw new NetworkError("Thành viên không còn tồn tại. Hãy tải lại trang.");
  if (current.isRoot) throw new NetworkError("Không thể xóa gốc mạng lưới. Bạn đổi tên được, nhưng gốc phải luôn có.");
  const leaderChildren = await tx.networkMember.count({ where: { leaderId: id } });
  const referrals = await tx.networkMember.count({ where: { referrerId: id } });
  await tx.networkMember.delete({ where: { id } });
  return { leaderChildren, referrals };
}

// Several members at once (the bulk delete in the table). All or nothing: if any of them
// is gone or is the root, nothing is deleted. People below them are not deleted; the
// foreign keys put them in UNASSIGNED. The counts only include people who stay, which is
// what the confirmation the admin saw promised.
export async function deleteMembersTx(
  tx: Tx,
  ids: string[]
): Promise<{ deleted: number; leaderChildren: number; referrals: number }> {
  await lockNetwork(tx);
  const unique = [...new Set(ids)];
  const targets = await tx.networkMember.findMany({ where: { id: { in: unique } }, select: { id: true, isRoot: true } });
  if (targets.length !== unique.length) throw new NetworkError("Một số thành viên không còn tồn tại. Hãy tải lại trang.");
  if (targets.some((t) => t.isRoot)) throw new NetworkError("Không thể xóa gốc mạng lưới. Hãy bỏ chọn gốc rồi thử lại.");
  const leaderChildren = await tx.networkMember.count({ where: { leaderId: { in: unique }, id: { notIn: unique } } });
  const referrals = await tx.networkMember.count({ where: { referrerId: { in: unique }, id: { notIn: unique } } });
  await tx.networkMember.deleteMany({ where: { id: { in: unique } } });
  return { deleted: unique.length, leaderChildren, referrals };
}

export type ImportResult = { created: number; skipped: number; createdRoot: boolean };

// The authoritative import. The browser already ran the same planner to show
// a preview, but nothing it computed is trusted: the plan is rebuilt here
// against the live member list inside the transaction, and anything that
// blocks it (a stale choice, an ID someone else just took) aborts the lot.
export async function importMembersTx(
  tx: Tx,
  admin: Admin,
  input: { rows: ImportRow[]; resolutions: Record<string, Resolution | undefined> }
): Promise<ImportResult> {
  await lockNetwork(tx);
  const existing = await tx.networkMember.findMany({ select: { id: true, name: true, igniteId: true, isRoot: true } });
  const plan = planImport({ rows: input.rows, existing, resolutions: input.resolutions });

  if (plan.errors.length > 0) throw new NetworkError(plan.errors[0].message);
  if (!plan.ready) throw new NetworkError("Còn tên chưa được xử lý. Hãy chọn cách xử lý cho từng tên rồi nhập lại.");
  if (plan.create.length === 0) return { created: 0, skipped: plan.skipped.length, createdRoot: false };

  const existingRoot = existing.find((e) => e.isRoot) ?? null;
  const rootId = existingRoot?.id ?? randomUUID();
  const idByKey = new Map<string, string>();
  for (const m of plan.create) idByKey.set(m.key, randomUUID());
  const resolveKey = (key: string | null): string | null => {
    if (!key) return null;
    if (key === "root") return rootId;
    if (key.startsWith("db:")) return key.slice(3);
    return idByKey.get(key) ?? null;
  };

  const data: Prisma.NetworkMemberCreateManyInput[] = [];
  if (!existingRoot) data.push({ id: rootId, name: "LN", status: "LEAD", isRoot: true });
  for (const m of plan.create) {
    data.push({
      id: idByKey.get(m.key)!,
      name: m.name,
      igniteId: m.igniteId,
      status: m.status,
      team: m.team,
      leaderId: resolveKey(m.leader),
      referrerId: resolveKey(m.referrer),
    });
  }
  // One statement: Postgres checks the self-referencing foreign keys once the
  // whole INSERT is in, so a row may point at another row of the same batch.
  await tx.networkMember.createMany({ data });

  const today = todayVN();
  const history: Prisma.NetworkMemberStatusHistoryCreateManyInput[] = [];
  const addHistory = (memberId: string, status: NetworkStatus, reason: string) =>
    history.push({
      memberId,
      fromStatus: null,
      toStatus: status,
      reason,
      effectiveDate: today,
      changedById: admin.id,
      changedByName: admin.name,
    });
  if (!existingRoot) addHistory(rootId, "LEAD", "Gốc mạng lưới tạo khi nhập Excel");
  for (const m of plan.create) {
    addHistory(idByKey.get(m.key)!, m.status, m.sourceRow ? "Nhập từ Excel" : "Tạo khi nhập Excel (tên chưa có trong file)");
  }
  await tx.networkMemberStatusHistory.createMany({ data: history });

  return { created: plan.create.length, skipped: plan.skipped.length, createdRoot: !existingRoot };
}
