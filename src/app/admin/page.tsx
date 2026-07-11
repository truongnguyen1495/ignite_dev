import Link from "next/link";
import { Users, ClipboardList, BookOpen, ArrowUpCircle, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminOverviewPage() {
  const [studentCount, pendingRegistrations, pendingRequests, lessonCount, attemptCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", adminOnly: false } }),
      prisma.user.count({ where: { role: "STUDENT", adminOnly: false, status: "PENDING" } }),
      prisma.levelUpRequest.count({ where: { status: "PENDING" } }),
      prisma.lesson.count(),
      prisma.quizAttempt.count(),
    ]);

  const stats = [
    { label: "Học viên", value: studentCount, icon: Users, href: "/admin/students" },
    { label: "Đăng ký chờ duyệt", value: pendingRegistrations, icon: UserPlus, href: "/admin/students" },
    { label: "Yêu cầu lên cấp đang chờ", value: pendingRequests, icon: ArrowUpCircle, href: "/admin/level-up-requests" },
    { label: "Bài học", value: lessonCount, icon: BookOpen, href: "/admin/lessons" },
    { label: "Lượt làm bài test", value: attemptCount, icon: ClipboardList, href: "/admin/results" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Tổng quan" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
