import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { approveLevelUpRequestAction } from "./actions";
import { RejectForm } from "./reject-form";

export default async function LevelUpRequestsPage() {
  const [pending, history] = await Promise.all([
    prisma.levelUpRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { student: true },
    }),
    prisma.levelUpRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
      include: { student: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Yêu cầu lên cấp đang chờ</h1>
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-500">Không có yêu cầu nào đang chờ duyệt.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((req) => (
              <li key={req.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="font-medium">{req.student.name}</p>
                <p className="text-sm text-zinc-500">
                  {req.student.email} · Đang ở {LEVEL_LABELS[req.fromLevel]}, xin lên {LEVEL_LABELS[req.toLevel]}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <form action={approveLevelUpRequestAction} className="flex items-center gap-2">
                    <input type="hidden" name="requestId" value={req.id} />
                    <select
                      name="toLevel"
                      defaultValue={req.toLevel}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {ORDERED_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
                    >
                      Duyệt
                    </button>
                  </form>
                  <RejectForm requestId={req.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500">Lịch sử gần đây</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">Chưa có yêu cầu nào được xử lý.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((req) => (
              <li key={req.id} className="rounded-lg border border-zinc-100 p-3 text-sm dark:border-zinc-900">
                <span className="font-medium">{req.student.name}</span> — {LEVEL_LABELS[req.fromLevel]} →{" "}
                {LEVEL_LABELS[req.toLevel]} —{" "}
                <span className={req.status === "APPROVED" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {req.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
                </span>
                {req.status === "REJECTED" && req.reviewerNote && (
                  <span className="text-zinc-500"> ({req.reviewerNote})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
