import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { User } from "@prisma/client";
import { LEVEL_LABELS } from "@/lib/levels";
import { formatVND } from "@/lib/currency";
import { dateOnlyVN, formatDateVN, formatTimeVN, todayVN } from "@/lib/groups";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getOverviewActions, type ActionItem, type ActionTone } from "@/lib/overview";
import { CardHead, OverviewCard, plural } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

const STRIPE: Record<ActionTone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

const META_TONE: Record<ActionTone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-faint",
};

/**
 * An absolute clock time, not a "còn 22 phút" countdown. This page is
 * rendered on the server and never re-renders on its own, so a countdown
 * would be wrong the moment it arrived; the order's own page is where a live
 * one belongs. Today's deadline shows just the hour, anything later carries
 * its date.
 */
function deadlineText(deadline: Date): string {
  const clock = formatTimeVN(deadline);
  const day = dateOnlyVN(deadline);
  return day.getTime() === todayVN().getTime() ? clock : `${clock} · ${formatDateVN(day)}`;
}

type Rendered = { title: string; detail: string | null; meta: string | null; action: string };

function render(item: ActionItem, copy: Copy): Rendered {
  switch (item.kind) {
    case "pendingOrder":
      return {
        title: copy.orderPendingTitle,
        // Data joined by separators, never a sentence — see the dictionary's
        // note on why nothing in this app interpolates into localized copy.
        detail: `${item.orderCode} · ${item.itemCount} ${plural(
          item.itemCount,
          copy.unitItemOne,
          copy.unitItemMany
        )} · ${formatVND(item.totalAmount)}`,
        meta: item.deadline ? `${copy.orderDeadlineLabel} ${deadlineText(item.deadline)}` : copy.orderPendingHint,
        action: copy.actionPay,
      };
    case "missingAddress":
      return {
        title: copy.missingAddressTitle,
        detail: copy.missingAddressHint,
        meta: null,
        action: copy.actionAdd,
      };
    case "pendingQuiz":
      return {
        title: copy.quizPendingTitle,
        detail: item.lessonTitle,
        meta: copy.quizPendingMeta,
        action: copy.actionRetake,
      };
    case "levelUpRejected":
      return {
        title: copy.levelUpRejectedTitle,
        detail: item.note ?? copy.levelUpRejectedNoNote,
        meta: LEVEL_LABELS[item.toLevel],
        action: copy.actionView,
      };
    case "overdueTask":
      return {
        title: copy.overdueTaskTitle,
        detail: item.taskTitle,
        meta: `${copy.overdueTaskMeta} ${item.dueTime}`,
        action: copy.actionDoNow,
      };
    case "explanationRejected":
      return {
        title: copy.explanationRejectedTitle,
        detail: item.taskTitle,
        meta: null,
        action: copy.actionResend,
      };
    case "missingPhone":
      return {
        title: copy.missingPhoneTitle,
        detail: copy.missingPhoneHint,
        meta: null,
        action: copy.actionAdd,
      };
  }
}

export async function ActionsCard({ student, copy }: { student: User; copy: Copy }) {
  const { items, total } = await getOverviewActions(student);

  if (items.length === 0) {
    return (
      <OverviewCard>
        <CardHead title={copy.actionsTitle} />
        <div className="flex items-center gap-3 rounded-xl bg-success-bg px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <span className="min-w-0">
            <b className="block text-sm font-medium text-foreground">{copy.actionsEmptyTitle}</b>
            <span className="text-xs text-muted">{copy.actionsEmptyBody}</span>
          </span>
        </div>
      </OverviewCard>
    );
  }

  return (
    <OverviewCard>
      <CardHead
        title={copy.actionsTitle}
        meta={
          <span className="tabular-nums">
            {total} {plural(total, copy.actionsCountOne, copy.actionsCountMany)}
          </span>
        }
      />
      <ul className="flex flex-col">
        {items.map((item, index) => {
          const view = render(item, copy);
          const first = index === 0;
          return (
            <li
              key={`${item.kind}-${index}`}
              className={`flex items-center gap-3 py-3 ${first ? "pt-0" : "border-t border-border"}`}
            >
              <span aria-hidden="true" className={`w-[3px] self-stretch rounded-full ${STRIPE[item.tone]}`} />
              <span className="min-w-0 flex-1">
                <b className="block text-sm font-medium text-foreground">{view.title}</b>
                {view.detail && <span className="mt-0.5 block truncate text-xs text-muted">{view.detail}</span>}
              </span>
              {view.meta && (
                <span className={`hidden shrink-0 font-mono text-[11px] tabular-nums sm:block ${META_TONE[item.tone]}`}>
                  {view.meta}
                </span>
              )}
              <Link
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  item.tone === "danger"
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border-strong text-foreground hover:bg-surface-hover"
                }`}
              >
                {view.action}
              </Link>
            </li>
          );
        })}
      </ul>
    </OverviewCard>
  );
}
