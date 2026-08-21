import { Suspense } from "react";
import { requireActiveStudent } from "@/lib/access";
import { getDictionary } from "@/lib/i18n/get-locale";
import { DeniedNotice } from "@/components/ui/denied-notice";
import { ActionsCard } from "./_overview/actions-card";
import { CoursesCard } from "./_overview/courses-card";
import { GreetingStrip, PulseStats } from "./_overview/greeting";
import { InboxCard } from "./_overview/inbox-card";
import { LearningCard } from "./_overview/learning-card";
import { LibraryCard } from "./_overview/library-card";
import { MomentumCard } from "./_overview/momentum-card";
import { QuoteCard } from "./_overview/quote-card";
import { ShoppingCard } from "./_overview/shopping-card";
import { TasksCard } from "./_overview/tasks-card";
import { CardSkeleton, StatsSkeleton } from "./_overview/ui";

/**
 * The member overview — what /dashboard answers to after signing in. The
 * six-level roadmap that used to live here moved to /dashboard/lo-trinh; it
 * is still the spine of the product and still the first row in the sidebar
 * under this one, it just isn't the landing page any more.
 *
 * Every block that needs the database sits in its own <Suspense>. That is
 * not decoration: DATABASE_URL runs with connection_limit=1, so the blocks'
 * queries can only ever run one after another (see the note at the top of
 * src/lib/overview.ts). Streaming them means the frame, the greeting and the
 * two query-free cards are on screen immediately, and each card fills in as
 * its own turn on the connection comes up — instead of the whole page
 * waiting for the slowest one.
 *
 * Two cards render synchronously and are deliberately NOT wrapped: the
 * business-momentum placeholder and the quote of the day, neither of which
 * reads anything.
 *
 * The layout is left-heavy on purpose: the wide column carries what a member
 * has to act on, the narrow one what they only glance at.
 */
export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied } = await searchParams;
  const { t } = await getDictionary();
  const copy = t.dashboardOverviewPage;
  const levelsCopy = t.dashboardLevelsPage;

  return (
    <div className="space-y-5">
      {/* Feature-off denials (chat, whiteboards) land here. Level-ladder
          denials go to /dashboard/lo-trinh instead — see requireLevelAccess. */}
      {denied && <DeniedNotice>{levelsCopy.accessDenied}</DeniedNotice>}

      <GreetingStrip student={student} copy={copy}>
        <Suspense fallback={<StatsSkeleton />}>
          <PulseStats studentId={student.id} copy={copy} />
        </Suspense>
      </GreetingStrip>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <ActionsCard student={student} copy={copy} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <LearningCard student={student} copy={copy} levelsCopy={levelsCopy} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={2} />}>
            <CoursesCard student={student} copy={copy} levelsCopy={levelsCopy} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <TasksCard studentId={student.id} copy={copy} />
          </Suspense>
          <MomentumCard copy={copy} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <InboxCard student={student} copy={copy} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={2} />}>
            <ShoppingCard student={student} copy={copy} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={2} />}>
            <LibraryCard student={student} copy={copy} />
          </Suspense>
          <QuoteCard copy={copy} />
        </div>
      </div>
    </div>
  );
}
