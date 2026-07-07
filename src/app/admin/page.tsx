import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [studentCount, pendingRequests, lessonCount, attemptCount] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.levelUpRequest.count({ where: { status: "PENDING" } }),
    prisma.lesson.count(),
    prisma.quizAttempt.count(),
  ]);

  const stats = [
    { label: "Học viên", value: studentCount },
    { label: "Yêu cầu lên cấp đang chờ", value: pendingRequests },
    { label: "Bài học", value: lessonCount },
    { label: "Lượt làm bài test", value: attemptCount },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tổng quan</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-sm text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
