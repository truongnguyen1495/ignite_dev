import Link from "next/link";
import { UserCog, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireActiveSuperAdmin } from "@/lib/access";
import { ChatToggle } from "./chat-toggle";
import { RegistrationToggle } from "./registration-toggle";
import { LanguageToggle } from "./language-toggle";

export default async function SettingsPage() {
  await requireActiveSuperAdmin();
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" />
      <Card className="max-w-lg">
        <ChatToggle chatEnabled={settings.chatEnabled} />
      </Card>
      <Card className="max-w-lg">
        <RegistrationToggle registrationEnabled={settings.registrationEnabled} />
      </Card>
      <Card className="max-w-lg">
        <LanguageToggle />
      </Card>
      <Link
        href="/admin/admins"
        className="flex max-w-lg items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserCog className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Quản lý Admin</p>
          <p className="text-xs text-muted">Cấp/thu hồi quyền admin cho tài khoản, xem toàn bộ thông tin từng admin.</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Link>
    </div>
  );
}
