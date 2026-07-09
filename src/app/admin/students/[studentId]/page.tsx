import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EditStudentForm } from "./edit-student-form";
import { DeleteStudentButton, ToggleStudentStatusButton, ApproveStudentButton } from "./danger-actions";
import { LEVEL_LABELS } from "@/lib/levels";
import { StatusBadge } from "@/components/ui/status-badge";
import { LevelBadge } from "@/components/ui/level-badge";
import { CollapsibleSection } from "./collapsible-section";
import { AttemptGroup } from "./attempt-group";

const LEVEL_UP_STATUS_LABELS = {
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") {
    notFound();
  }

  const [attempts, levelUpRequests] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { studentId },
      orderBy: { attemptedAt: "desc" },
      include: { quiz: { include: { lesson: true } } },
    }),
    prisma.levelUpRequest.findMany({
      where: { studentId },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const isPending = student.status === "PENDING";
  const hasRegistrationInfo = Boolean(student.username || student.dateOfBirth);

  // A student can retake the same quiz many times; grouping by quiz collapses
  // those into one row (the latest attempt) with the rest tucked behind an
  // expand toggle, same pattern as the admin results page.
  const attemptGroups = new Map<
    string,
    { lessonTitle: string; latest: (typeof attempts)[number]; history: (typeof attempts)[number][] }
  >();
  for (const attempt of attempts) {
    const group = attemptGroups.get(attempt.quizId);
    if (group) {
      group.history.push(attempt);
    } else {
      attemptGroups.set(attempt.quizId, {
        lessonTitle: attempt.quiz.lesson.title,
        latest: attempt,
        history: [],
      });
    }
  }
  const groupedAttempts = Array.from(attemptGroups.values());

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {student.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{student.name}</h1>
              <StatusBadge status={student.status} />
              <LevelBadge level={student.grantedLevel} />
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">{student.email}</p>
          </div>
        </div>
      </div>

      {isPending && (
        <div className="space-y-4 rounded-xl border border-warning/30 bg-warning-bg p-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-warning" />
            Đăng ký đang chờ duyệt
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-xs text-muted">Email</dt>
              <dd className="break-words text-foreground">{student.email}</dd>
            </div>
            {student.username && (
              <div className="min-w-0">
                <dt className="text-xs text-muted">Username</dt>
                <dd className="break-words text-foreground">@{student.username}</dd>
              </div>
            )}
            {student.dateOfBirth && (
              <div className="min-w-0">
                <dt className="text-xs text-muted">Ngày sinh</dt>
                <dd className="text-foreground">{student.dateOfBirth.toLocaleDateString("vi-VN")}</dd>
              </div>
            )}
            <div className="min-w-0">
              <dt className="text-xs text-muted">Ngày đăng ký</dt>
              <dd className="text-foreground">{student.createdAt.toLocaleDateString("vi-VN")}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-3 border-t border-warning/30 pt-4">
            <ApproveStudentButton studentId={student.id} />
            <DeleteStudentButton
              studentId={student.id}
              studentName={student.name}
              pendingRegistration
              redirectAfter
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
        {!isPending && hasRegistrationInfo && (
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-background px-4 py-3 text-sm">
            {student.username && (
              <span className="text-muted">
                Username: <span className="text-foreground">@{student.username}</span>
              </span>
            )}
            {student.dateOfBirth && (
              <span className="text-muted">
                Ngày sinh:{" "}
                <span className="text-foreground">{student.dateOfBirth.toLocaleDateString("vi-VN")}</span>
              </span>
            )}
          </div>
        )}
        <EditStudentForm
          studentId={student.id}
          name={student.name}
          email={student.email}
          grantedLevel={student.grantedLevel}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <CollapsibleSection title={`Lịch sử làm bài test (${attempts.length})`}>
          {groupedAttempts.length === 0 ? (
            <p className="text-sm text-muted">Học viên chưa làm bài test nào.</p>
          ) : (
            <ul className="space-y-2">
              {groupedAttempts.map(({ lessonTitle, latest, history }) => (
                <AttemptGroup key={latest.id} lessonTitle={lessonTitle} latest={latest} history={history} />
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <CollapsibleSection title={`Lịch sử xin lên cấp (${levelUpRequests.length})`}>
          {levelUpRequests.length === 0 ? (
            <p className="text-sm text-muted">Học viên chưa gửi yêu cầu lên cấp nào.</p>
          ) : (
            <ul className="space-y-2">
              {levelUpRequests.map((req) => (
                <li key={req.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-foreground">
                      {LEVEL_LABELS[req.fromLevel]}
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted" />
                      {LEVEL_LABELS[req.toLevel]}
                    </span>
                    {req.status === "APPROVED" ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-4 w-4" /> {LEVEL_UP_STATUS_LABELS[req.status]}
                      </span>
                    ) : req.status === "REJECTED" ? (
                      <span className="flex items-center gap-1 text-danger">
                        <XCircle className="h-4 w-4" /> {LEVEL_UP_STATUS_LABELS[req.status]}
                      </span>
                    ) : (
                      <span className="text-warning">{LEVEL_UP_STATUS_LABELS[req.status]}</span>
                    )}
                  </div>
                  <div className="mt-1 text-muted">
                    {req.requestedAt.toLocaleString("vi-VN")}
                    {req.status === "REJECTED" && req.reviewerNote && ` — Lý do: ${req.reviewerNote}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>

      {!isPending && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-foreground">Khu vực nguy hiểm</h2>
          <div className="flex items-center gap-3">
            <ToggleStudentStatusButton studentId={student.id} locked={student.status === "LOCKED"} />
            <DeleteStudentButton studentId={student.id} studentName={student.name} redirectAfter />
          </div>
        </div>
      )}
    </div>
  );
}
