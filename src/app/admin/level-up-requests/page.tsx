import { CheckCircle2, XCircle, ArrowRight, ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { getLevelCompletionStatus } from "@/lib/level-completion";
import { LevelBadge } from "@/components/ui/level-badge";
import { approveLevelUpRequestAction } from "./actions";
import { RejectForm } from "./reject-form";
import { CompletionDetails } from "./completion-details";

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

  const completionByRequest = new Map(
    await Promise.all(
      pending.map(
        async (req) => [req.id, await getLevelCompletionStatus(req.studentId, req.fromLevel)] as const
      )
    )
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">Yêu cầu lên cấp đang chờ</h1>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Không có yêu cầu nào đang chờ duyệt.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((req) => {
              const completion = completionByRequest.get(req.id)!;
              const isComplete = completion.incomplete.length === 0;
              return (
                <li
                  key={req.id}
                  className="rounded-xl border border-border border-l-4 border-l-warning bg-surface p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{req.student.name}</p>
                      <p className="text-sm text-muted">{req.student.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <LevelBadge level={req.fromLevel} full />
                      <ArrowRight className="h-3.5 w-3.5 text-muted" />
                      <LevelBadge level={req.toLevel} full />
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    Yêu cầu lúc {req.requestedAt.toLocaleString("vi-VN")}
                  </p>

                  <div className="mt-3 flex items-start gap-1.5 text-sm">
                    <ClipboardCheck
                      className={`mt-0.5 h-4 w-4 shrink-0 ${isComplete ? "text-success" : "text-warning"}`}
                    />
                    {isComplete ? (
                      <span className="text-success">
                        Đã hoàn thành {completion.completed}/{completion.total} bài test của{" "}
                        {LEVEL_LABELS[req.fromLevel]}
                      </span>
                    ) : (
                      <span className="text-warning">
                        Mới hoàn thành {completion.completed}/{completion.total} bài test của{" "}
                        {LEVEL_LABELS[req.fromLevel]} — còn thiếu:{" "}
                        {completion.incomplete.map((quiz) => quiz.lesson.title).join(", ")}
                      </span>
                    )}
                  </div>

                  <CompletionDetails details={completion.details} />

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
                    <form action={approveLevelUpRequestAction} className="flex items-center gap-2">
                      <input type="hidden" name="requestId" value={req.id} />
                      <select
                        name="toLevel"
                        defaultValue={req.toLevel}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      >
                        {ORDERED_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {LEVEL_LABELS[level]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Duyệt
                      </button>
                    </form>
                    <RejectForm requestId={req.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted">Lịch sử gần đây</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Chưa có yêu cầu nào được xử lý.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{req.student.name}</span>
                  <LevelBadge level={req.fromLevel} />
                  <ArrowRight className="h-3 w-3 text-muted" />
                  <LevelBadge level={req.toLevel} />
                  {req.status === "REJECTED" && req.reviewerNote && (
                    <span className="text-muted">({req.reviewerNote})</span>
                  )}
                </div>
                {req.status === "APPROVED" ? (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-4 w-4" /> Đã duyệt
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-danger">
                    <XCircle className="h-4 w-4" /> Đã từ chối
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
