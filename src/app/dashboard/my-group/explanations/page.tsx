import { BackLink } from "@/components/ui/back-link";
import { requireOwnGroupLeadership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { formatDateVN } from "@/lib/groups";
import { ExplanationCard } from "@/components/groups/explanation-card";
import { reviewExplanationAction } from "../actions";

export default async function ExplanationsPage() {
  const { membership } = await requireOwnGroupLeadership();

  const pending = await prisma.dailyTaskCompletion.findMany({
    where: { status: "EXPLAINED_PENDING", task: { groupId: membership.groupId } },
    include: { task: true, user: true },
    orderBy: { explainedAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <BackLink href="/dashboard/my-group">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Giải trình chờ duyệt</h1>
        <p className="mt-1 text-sm text-muted">{membership.group.name}</p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
          Đã xử lý hết giải trình đang chờ.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((completion) => (
            <ExplanationCard
              key={completion.id}
              completionId={completion.id}
              memberName={completion.user.name}
              taskTitle={completion.task.title}
              dateLabel={formatDateVN(completion.date)}
              explanationText={completion.explanationText ?? ""}
              action={reviewExplanationAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
