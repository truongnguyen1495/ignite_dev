import { Users, ClipboardList, BookOpen, ArrowUpCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [studentCount, pendingRequests, lessonCount, attemptCount] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.levelUpRequest.count({ where: { status: "PENDING" } }),
    prisma.lesson.count(),
    prisma.quizAttempt.count(),
  ]);

  const stats = [
    { label: "Học viên", value: studentCount, icon: Users },
    { label: "Yêu cầu lên cấp đang chờ", value: pendingRequests, icon: ArrowUpCircle },
    { label: "Bài học", value: lessonCount, icon: BookOpen },
    { label: "Lượt làm bài test", value: attemptCount, icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Tổng quan</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
