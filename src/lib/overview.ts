import "server-only";
import { cache } from "react";
import type {
  AnnouncementCategory,
  DailyTaskCategory,
  LibraryItemType,
  Level,
  OrderStatus,
  User,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isChatEnabled, isSalesEnabled } from "@/lib/access";
import { getStudentChatInbox } from "@/lib/chat";
import { announcementVisibleTo } from "@/lib/announcements";
import { hasLevelAccess } from "@/lib/levels";
import { getPricing } from "@/lib/pricing";
import { formatOrderCode } from "@/lib/orders";
import { getLevelRoadmap, type LevelRoadmap } from "@/lib/level-roadmap";
import {
  computeWeeklyPoints,
  getTodayTasksForUser,
  sumWeeklyPointsByUser,
  weeklyPointQueries,
  type TodayTaskView,
} from "@/lib/group-data";
import {
  BASE_SPINS_PER_DAY,
  addDays,
  computeStreaksFromDates,
  dateOnly,
  getWeekStart,
  rankByPoints,
  todayVN,
} from "@/lib/groups";

/**
 * Data layer for /dashboard, the member overview.
 *
 * Two rules run through this whole file.
 *
 * 1. DATABASE_URL runs with connection_limit=1, so `Promise.all` does NOT
 *    parallelize — it just queues on the single connection. Every function
 *    here therefore batches its reads with `prisma.$transaction([...])`,
 *    which sends them as one round trip. Same reasoning as getLevelRoadmap
 *    (src/lib/level-roadmap.ts) and getWeeklyLeaderboard.
 *
 * 2. The page renders each block inside its own <Suspense>, and several
 *    blocks want the same facts — the roadmap feeds both "Việc học của bạn"
 *    and the "bài test chưa đạt" row in "Cần bạn xử lý"; today's tasks feed
 *    both the task list and its spin allowance. Every entry point below is
 *    wrapped in React's cache(), which is scoped to one request, so the
 *    second block to ask gets the first block's result (or awaits the very
 *    same in-flight promise) instead of replaying the queries. All of them
 *    key on a plain string id, or on the User object requireActiveStudent
 *    hands out — itself cache()d, so it is one stable reference per request.
 *
 * Nothing here writes. The one exception a reader might expect — expiring an
 * overdue PENDING order — is deliberately left to the order pages that own
 * that sweep; see getOverviewShopping.
 */

/** Shared by both blocks that need the ladder. */
export const getOverviewRoadmap = cache(
  async (studentId: string, grantedLevel: Level): Promise<LevelRoadmap> =>
    getLevelRoadmap(studentId, grantedLevel)
);

// ---------------------------------------------------------------------------
// Nhịp của tuần — the strip under the greeting, and the three mini-stats
// inside the task card.
// ---------------------------------------------------------------------------

export type OverviewPulse = {
  streak: { current: number; best: number };
  weeklyPoints: number;
  /** Null for a member who isn't in any group — every caller must handle it. */
  group: { id: string; name: string; rank: number; memberCount: number } | null;
};

export const getOverviewPulse = cache(async (studentId: string): Promise<OverviewPulse> => {
  const today = todayVN();
  const weekStart = getWeekStart(today);

  const [membership, checkIns] = await prisma.$transaction([
    prisma.groupMembership.findUnique({
      where: { userId: studentId },
      select: { groupId: true, group: { select: { name: true } } },
    }),
    prisma.checkIn.findMany({
      where: { userId: studentId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  const streak = computeStreaksFromDates(
    checkIns.map((c) => dateOnly(c.date).getTime()),
    today.getTime()
  );

  if (!membership) {
    return { streak, weeklyPoints: await computeWeeklyPoints(studentId, weekStart), group: null };
  }

  // Deliberately not getWeeklyLeaderboard(): that one hydrates a full User
  // and Group row per member for the leaderboard table on /dashboard/my-group,
  // and Prisma turns each of those nested includes into its own statement —
  // about five round trips where this strip needs two. Ids and points are the
  // whole of what a rank is made of. The sum itself is still the group
  // feature's own, reused as queries so it can ride in one batch.
  const members = await prisma.groupMembership.findMany({
    where: { groupId: membership.groupId },
    select: { userId: true },
  });
  const [taskCompletions, spinResults] = await prisma.$transaction(
    weeklyPointQueries(
      members.map((m) => m.userId),
      weekStart
    )
  );
  const pointsByUser = sumWeeklyPointsByUser(taskCompletions, spinResults);

  const myPoints = pointsByUser.get(studentId) ?? 0;

  return {
    streak,
    weeklyPoints: myPoints,
    group: {
      id: membership.groupId,
      name: membership.group.name,
      // Shared with /dashboard/my-group so the two screens can't report a
      // different "hạng" for the same week.
      rank: rankByPoints(
        members.map((m) => pointsByUser.get(m.userId) ?? 0),
        myPoints
      ),
      memberCount: members.length,
    },
  };
});

// ---------------------------------------------------------------------------
// Nhiệm vụ hôm nay
// ---------------------------------------------------------------------------

export type OverviewTaskStatus = "done" | "excused" | "awaitingReview" | "rejected" | "overdue" | "pending";

export type OverviewTask = {
  id: string;
  title: string;
  category: DailyTaskCategory;
  points: number;
  dueTime: string;
  status: OverviewTaskStatus;
};

export type OverviewTasks = {
  inGroup: boolean;
  groupName: string | null;
  tasks: OverviewTask[];
  doneCount: number;
  spinsRemaining: number;
};

function taskStatus(view: TodayTaskView): OverviewTaskStatus {
  switch (view.completion?.status) {
    case "DONE":
      return "done";
    case "EXPLAINED_APPROVED":
      return "excused";
    case "EXPLAINED_PENDING":
      return "awaitingReview";
    case "EXPLAINED_REJECTED":
      return "rejected";
    default:
      return view.isOverdueUntouched ? "overdue" : "pending";
  }
}

export const getOverviewTasks = cache(async (studentId: string): Promise<OverviewTasks> => {
  const pulse = await getOverviewPulse(studentId);
  if (!pulse.group) {
    return { inGroup: false, groupName: null, tasks: [], doneCount: 0, spinsRemaining: 0 };
  }

  const views = await getTodayTasksForUser(studentId);

  const today = todayVN();
  const [checkedInToday, spinsUsedToday] = await prisma.$transaction([
    prisma.checkIn.findUnique({ where: { userId_date: { userId: studentId, date: today } } }),
    prisma.spinResult.count({ where: { userId: studentId, spunAt: { gte: today, lt: addDays(today, 1) } } }),
  ]);

  // Mirrors computeSpinAllowanceToday in src/lib/group-data.ts. Not calling
  // getSpinsRemainingToday() instead: that helper re-reads today's tasks to
  // work out the "hoàn thành hết nhiệm vụ" bonus, and this block has just
  // read them — reusing `views` saves three round trips on a connection that
  // can only do one at a time.
  let allowance = BASE_SPINS_PER_DAY;
  if (checkedInToday) allowance += 1;
  if (views.length > 0 && views.every((v) => v.completion?.status === "DONE")) allowance += 1;

  const tasks = views.map<OverviewTask>((view) => ({
    id: view.task.id,
    title: view.task.title,
    category: view.task.category,
    points: view.task.points,
    dueTime: view.task.dueTime,
    status: taskStatus(view),
  }));

  return {
    inGroup: true,
    groupName: pulse.group.name,
    tasks,
    doneCount: tasks.filter((t) => t.status === "done").length,
    spinsRemaining: Math.max(0, allowance - spinsUsedToday),
  };
});

// ---------------------------------------------------------------------------
// Cần bạn xử lý
// ---------------------------------------------------------------------------

export type ActionTone = "danger" | "warning" | "info";

/**
 * A discriminated union rather than pre-built sentences: the copy lives in
 * the dictionary (src/lib/i18n/dictionaries.ts) and the numbers/titles are
 * rendered beside it, never interpolated into it — the same rule the rest of
 * that file follows so Vietnamese and English can word things differently.
 */
export type ActionItem =
  | {
      kind: "pendingOrder";
      tone: "danger";
      href: string;
      orderCode: string;
      itemCount: number;
      totalAmount: number;
      deadline: Date | null;
    }
  | { kind: "missingAddress"; tone: "warning"; href: string }
  | { kind: "pendingQuiz"; tone: "warning"; href: string; lessonTitle: string }
  | { kind: "levelUpRejected"; tone: "warning"; href: string; toLevel: Level; note: string | null }
  | { kind: "overdueTask"; tone: "warning"; href: string; taskTitle: string; dueTime: string }
  | { kind: "explanationRejected"; tone: "info"; href: string; taskTitle: string }
  | { kind: "missingPhone"; tone: "info"; href: string };

export type OverviewActions = {
  /** Ranked, already trimmed to what the card shows. */
  items: ActionItem[];
  /** Everything outstanding, including what `items` had to leave out. */
  total: number;
};

const ACTION_LIST_LIMIT = 5;
const TONE_RANK: Record<ActionTone, number> = { danger: 0, warning: 1, info: 2 };

export const getOverviewActions = cache(async (student: User): Promise<OverviewActions> => {
  // Sequential on purpose (see the connection_limit note at the top), and
  // usually free anyway: by the time this block renders, the learning card
  // has normally already resolved the roadmap and the task card the tasks,
  // so these await a settled cache entry rather than issuing anything.
  const roadmap = await getOverviewRoadmap(student.id, student.grantedLevel);
  const tasks = await getOverviewTasks(student.id);
  const salesEnabled = await isSalesEnabled();

  const [pendingOrder, rejectedExplanations, cartCount, addressCount] = await prisma.$transaction([
    // Only an order still genuinely payable. An overdue one is already dead
    // in every way that matters — the sweep in src/lib/order-expiry.ts turns
    // it into CANCELLED the next time an order page loads — so the overview
    // filters it out here rather than writing from a page render.
    prisma.order.findFirst({
      where: {
        studentId: student.id,
        status: "PENDING",
        deletedAt: null,
        OR: [{ paymentDeadline: null }, { paymentDeadline: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        paymentDeadline: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.dailyTaskCompletion.findMany({
      where: { userId: student.id, status: "EXPLAINED_REJECTED" },
      orderBy: { reviewedAt: "desc" },
      take: ACTION_LIST_LIMIT,
      select: { id: true, task: { select: { title: true } } },
    }),
    prisma.cartItem.count({ where: { studentId: student.id } }),
    prisma.address.count({ where: { studentId: student.id } }),
  ]);

  const items: ActionItem[] = [];

  if (salesEnabled && pendingOrder) {
    items.push({
      kind: "pendingOrder",
      tone: "danger",
      href: `/dashboard/orders/${pendingOrder.id}`,
      orderCode: formatOrderCode(pendingOrder.orderNumber),
      itemCount: pendingOrder._count.items,
      totalAmount: pendingOrder.totalAmount,
      deadline: pendingOrder.paymentDeadline,
    });
  }

  // Only worth saying when they are actually about to buy something: User has
  // no address field, so an address only ever gets written at checkout (see
  // confirmCartOrderAction), and nagging a member who never shops would be
  // noise rather than a task.
  if (salesEnabled && cartCount > 0 && addressCount === 0) {
    items.push({ kind: "missingAddress", tone: "warning", href: "/dashboard/cart" });
  }

  for (const quiz of roadmap.pendingQuizzes) {
    items.push({
      kind: "pendingQuiz",
      tone: "warning",
      href: `/dashboard/lessons/${quiz.lessonId}`,
      lessonTitle: quiz.title,
    });
  }

  if (roadmap.latestRequest?.status === "REJECTED") {
    items.push({
      kind: "levelUpRejected",
      tone: "warning",
      href: "/dashboard/level-up",
      toLevel: roadmap.latestRequest.toLevel,
      note: roadmap.latestRequest.reviewerNote,
    });
  }

  for (const task of tasks.tasks) {
    if (task.status === "overdue") {
      items.push({
        kind: "overdueTask",
        tone: "warning",
        href: "/dashboard/my-group",
        taskTitle: task.title,
        dueTime: task.dueTime,
      });
    }
  }

  for (const row of rejectedExplanations) {
    items.push({
      kind: "explanationRejected",
      tone: "info",
      href: "/dashboard/my-group/explanations",
      taskTitle: row.task.title,
    });
  }

  if (!student.phoneNumber) {
    items.push({ kind: "missingPhone", tone: "info", href: "/dashboard/profile" });
  }

  // Stable sort: within one severity the order above is meaningful (money
  // first, then the ladder, then group work), and Array.prototype.sort has
  // been required to be stable since ES2019.
  items.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);

  return { items: items.slice(0, ACTION_LIST_LIMIT), total: items.length };
});

// ---------------------------------------------------------------------------
// Khóa học đang dở
// ---------------------------------------------------------------------------

export type OverviewCourse = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  totalLessons: number;
  completedCount: number;
  percent: number;
  /** Straight into the first lesson they haven't finished. */
  href: string;
};

const COURSE_LIST_LIMIT = 3;

export const getOverviewCourses = cache(async (student: User): Promise<OverviewCourse[]> => {
  const [courses, grants, levelGrants, completions] = await prisma.$transaction([
    prisma.course.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        isFree: true,
        lessons: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        },
      },
    }),
    prisma.courseAccessGrant.findMany({
      where: { studentId: student.id },
      select: { courseId: true },
    }),
    prisma.courseLevelGrant.findMany({ select: { courseId: true, minLevel: true } }),
    prisma.courseLessonCompletion.findMany({
      where: { studentId: student.id },
      select: { completedAt: true, courseLesson: { select: { id: true, courseId: true } } },
    }),
  ]);

  // "Đang dở" means a course they can actually open in full. A trial-access
  // course (hiddenFromGuest false, no grant) is excluded on purpose: its
  // progress bar could never reach 100%, so it would sit here forever.
  const grantedCourseIds = new Set(grants.map((g) => g.courseId));
  const levelUnlockedCourseIds = new Set(
    levelGrants.filter((lg) => hasLevelAccess(student.grantedLevel, lg.minLevel)).map((lg) => lg.courseId)
  );

  const doneLessonIdsByCourse = new Map<string, Set<string>>();
  const lastTouchedByCourse = new Map<string, number>();
  for (const completion of completions) {
    const { courseId, id } = completion.courseLesson;
    const set = doneLessonIdsByCourse.get(courseId);
    if (set) set.add(id);
    else doneLessonIdsByCourse.set(courseId, new Set([id]));

    const at = completion.completedAt.getTime();
    if (at > (lastTouchedByCourse.get(courseId) ?? 0)) lastTouchedByCourse.set(courseId, at);
  }

  return courses
    .filter(
      (course) =>
        course.isFree || grantedCourseIds.has(course.id) || levelUnlockedCourseIds.has(course.id)
    )
    .flatMap<OverviewCourse>((course) => {
      const totalLessons = course.lessons.length;
      const done = doneLessonIdsByCourse.get(course.id) ?? new Set<string>();
      // Started, but not finished — a course they have never opened belongs
      // in the catalogue, and a finished one has nothing left to continue.
      if (totalLessons === 0 || done.size === 0 || done.size >= totalLessons) return [];

      const nextLesson = course.lessons.find((lesson) => !done.has(lesson.id));
      return [
        {
          id: course.id,
          title: course.title,
          coverImageUrl: course.coverImageUrl,
          totalLessons,
          completedCount: done.size,
          percent: Math.round((done.size / totalLessons) * 100),
          href: nextLesson
            ? `/dashboard/courses/${course.id}/lessons/${nextLesson.id}`
            : `/dashboard/courses/${course.id}`,
        },
      ];
    })
    .sort((a, b) => (lastTouchedByCourse.get(b.id) ?? 0) - (lastTouchedByCourse.get(a.id) ?? 0))
    .slice(0, COURSE_LIST_LIMIT);
});

// ---------------------------------------------------------------------------
// Thông báo & kết nối
// ---------------------------------------------------------------------------

export type OverviewAnnouncement = {
  id: string;
  title: string;
  category: AnnouncementCategory;
  publishedAt: Date;
  unread: boolean;
};

export type OverviewInbox = {
  announcements: OverviewAnnouncement[];
  unreadAnnouncements: number;
  /** Null when the chat feature is switched off — the row disappears entirely. */
  unreadMessages: number | null;
};

const ANNOUNCEMENT_LIST_LIMIT = 3;
// Read a few more than the list shows: visibility is decided in app code
// (announcementVisibleTo weighs minLevel against this member's level), not
// in the WHERE clause, so the newest rows may not all survive the filter.
const ANNOUNCEMENT_SCAN_LIMIT = 20;

export const getOverviewInbox = cache(async (student: User): Promise<OverviewInbox> => {
  const [announcements, reads] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: { visibleToStudents: true },
      orderBy: { publishedAt: "desc" },
      take: ANNOUNCEMENT_SCAN_LIMIT,
      select: {
        id: true,
        title: true,
        category: true,
        publishedAt: true,
        minLevel: true,
        visibleToStudents: true,
        visibleToLeveled: true,
      },
    }),
    prisma.announcementRead.findMany({
      where: { studentId: student.id },
      select: { announcementId: true },
    }),
  ]);

  const readIds = new Set(reads.map((r) => r.announcementId));
  const visible = announcements.filter((a) => announcementVisibleTo(a, student.grantedLevel));

  // Free: the dashboard layout already built this inbox for the sidebar's
  // unread pill, and getStudentChatInbox is cache()d on the same student
  // reference. See its comment in src/lib/chat.ts.
  const chatEnabled = await isChatEnabled();
  const inbox = chatEnabled ? await getStudentChatInbox(student) : null;

  return {
    announcements: visible.slice(0, ANNOUNCEMENT_LIST_LIMIT).map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      publishedAt: a.publishedAt,
      unread: !readIds.has(a.id),
    })),
    unreadAnnouncements: visible.filter((a) => !readIds.has(a.id)).length,
    unreadMessages: inbox
      ? inbox.support.unreadCount +
        inbox.directThreads.reduce((sum, t) => sum + t.unreadCount, 0) +
        inbox.groupRooms.reduce((sum, r) => sum + r.unreadCount, 0)
      : null,
  };
});

// ---------------------------------------------------------------------------
// Mua sắm
// ---------------------------------------------------------------------------

export type OverviewShopping = {
  latestOrder: {
    id: string;
    code: string;
    status: OrderStatus;
    itemCount: number;
    totalAmount: number;
  } | null;
  cart: { count: number; subtotal: number };
  /** Products whose level rule opens exactly at the level they hold now. */
  justUnlocked: { id: string; title: string; imageUrl: string | null }[];
};

const UNLOCKED_LIST_LIMIT = 4;

export const getOverviewShopping = cache(async (student: User): Promise<OverviewShopping | null> => {
  if (!(await isSalesEnabled())) return null;

  const [latestOrder, cartItems, unlockedGrants] = await prisma.$transaction([
    prisma.order.findFirst({
      where: { studentId: student.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.cartItem.findMany({
      where: { studentId: student.id },
      select: {
        quantity: true,
        course: { select: { price: true, salePrice: true } },
        libraryItem: { select: { price: true, salePrice: true } },
        product: { select: { price: true, salePrice: true } },
      },
    }),
    // A level grant AT their exact level is what "vừa mở khóa" means — a
    // grant below it opened long ago, one above is still shut. No visibility
    // query needed: holding the level the grant names is itself what makes a
    // hiddenFromGuest product visible (see getVisibleProductIds).
    prisma.productLevelGrant.findMany({
      where: { minLevel: student.grantedLevel },
      orderBy: { grantedAt: "desc" },
      take: UNLOCKED_LIST_LIMIT,
      select: { product: { select: { id: true, title: true, imageUrl: true } } },
    }),
  ]);

  // Same rule as the cart page itself (src/app/dashboard/cart/page.tsx): an
  // item that is no longer for sale counts as 0 rather than dropping out, so
  // the count and the subtotal always describe the same set of rows.
  const subtotal = cartItems.reduce((sum, item) => {
    const priceable = item.course ?? item.libraryItem ?? item.product;
    if (!priceable) return sum;
    const pricing = getPricing(priceable);
    return pricing.forSale ? sum + pricing.chargeAmount * item.quantity : sum;
  }, 0);

  return {
    latestOrder: latestOrder
      ? {
          id: latestOrder.id,
          code: formatOrderCode(latestOrder.orderNumber),
          status: latestOrder.status,
          itemCount: latestOrder._count.items,
          totalAmount: latestOrder.totalAmount,
        }
      : null,
    cart: { count: cartItems.length, subtotal },
    justUnlocked: unlockedGrants.map((g) => g.product),
  };
});

// ---------------------------------------------------------------------------
// Thư viện
// ---------------------------------------------------------------------------

export type OverviewLibraryItem = {
  id: string;
  title: string;
  author: string | null;
  type: LibraryItemType;
  coverImageUrl: string | null;
  pageCount: number | null;
  /** How it reached this member — decides which caption the card shows. */
  source: "owned" | "justUnlocked";
};

const LIBRARY_LIST_LIMIT = 3;

export const getOverviewLibrary = cache(async (student: User): Promise<OverviewLibraryItem[]> => {
  const [ownedGrants, unlockedGrants] = await prisma.$transaction([
    prisma.libraryAccessGrant.findMany({
      where: { studentId: student.id, libraryItem: { visibleToStudents: true } },
      orderBy: { grantedAt: "desc" },
      take: LIBRARY_LIST_LIMIT,
      select: {
        libraryItem: {
          select: { id: true, title: true, author: true, type: true, coverImageUrl: true, pageCount: true },
        },
      },
    }),
    prisma.libraryLevelGrant.findMany({
      where: { minLevel: student.grantedLevel, libraryItem: { visibleToStudents: true } },
      orderBy: { grantedAt: "desc" },
      take: LIBRARY_LIST_LIMIT,
      select: {
        libraryItem: {
          select: { id: true, title: true, author: true, type: true, coverImageUrl: true, pageCount: true },
        },
      },
    }),
  ]);

  // Owned first — a member's own copy outranks a level perk — and an item
  // reachable both ways is listed once, as owned.
  const seen = new Set<string>();
  const items: OverviewLibraryItem[] = [];
  for (const [source, grants] of [
    ["owned", ownedGrants],
    ["justUnlocked", unlockedGrants],
  ] as const) {
    for (const { libraryItem } of grants) {
      if (seen.has(libraryItem.id)) continue;
      seen.add(libraryItem.id);
      items.push({ ...libraryItem, source });
    }
  }
  return items.slice(0, LIBRARY_LIST_LIMIT);
});
