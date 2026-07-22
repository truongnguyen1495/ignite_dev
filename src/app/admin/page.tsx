import Link from "next/link";
import { Users, ClipboardList, BookOpen, ArrowUpCircle, Receipt, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { requireAnyAdminAccess, isChatEnabled, isSalesEnabled } from "@/lib/access";
import { getAdminSupportInbox } from "@/lib/chat";
import { getAdminGuestChatInbox } from "@/lib/guest-chat";
import type { AdminPermissionKind } from "@prisma/client";

export default async function AdminOverviewPage() {
  const { user: admin, isSuperAdmin, isAdminManager, permissions } = await requireAnyAdminAccess();
  const canManage = (permission: AdminPermissionKind) => isSuperAdmin || isAdminManager || permissions.has(permission);

  const chatEnabled = (await isChatEnabled()) && canManage("MANAGE_CHAT");
  const salesEnabled = (await isSalesEnabled()) && canManage("MANAGE_ORDERS");

  const [studentCount, pendingRequests, lessonCount, attemptCount, pendingOrders, inboxes] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", adminOnly: false } }),
    prisma.levelUpRequest.count({ where: { status: "PENDING" } }),
    prisma.lesson.count(),
    prisma.quizAttempt.count(),
    salesEnabled ? prisma.order.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    chatEnabled
      ? Promise.all([getAdminSupportInbox(admin.id), getAdminGuestChatInbox(admin.id)])
      : Promise.resolve([[], []] as const),
  ]);
  const unreadSupportCount = inboxes[0].reduce((sum, t) => sum + t.unreadCount, 0) + inboxes[1].reduce((sum, t) => sum + t.unreadCount, 0);

  const stats = [
    { label: "Học viên", value: studentCount, icon: Users, href: "/admin/students" },
    { label: "Yêu cầu lên cấp đang chờ", value: pendingRequests, icon: ArrowUpCircle, href: "/admin/level-up-requests" },
    { label: "Bài học", value: lessonCount, icon: BookOpen, href: "/admin/lessons" },
    { label: "Lượt làm bài test", value: attemptCount, icon: ClipboardList, href: "/admin/results" },
    ...(salesEnabled
      ? [{ label: "Đơn hàng chờ xác nhận", value: pendingOrders, icon: Receipt, href: "/admin/orders" }]
      : []),
    ...(chatEnabled
      ? [{ label: "Hỗ trợ học viên chưa đọc", value: unreadSupportCount, icon: MessageCircle, href: "/admin/chat" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Tổng quan" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-bg text-primary">
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
