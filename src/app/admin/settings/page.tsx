import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireActiveSuperAdmin } from "@/lib/access";
import { ChatToggle } from "./chat-toggle";
import { LanguageToggle } from "./language-toggle";
import { AdminRoleAssignment } from "./admin-role-assignment";

export default async function SettingsPage() {
  await requireActiveSuperAdmin();
  const [settings, grantedAdmins] = await Promise.all([
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.user.findMany({
      where: { role: "STUDENT", adminPermissions: { some: {} } },
      select: {
        id: true,
        name: true,
        email: true,
        adminPermissions: { select: { permission: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const grantedAdminItems = grantedAdmins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    permissions: a.adminPermissions.map((p) => p.permission),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" />
      <Card className="max-w-lg">
        <ChatToggle chatEnabled={settings.chatEnabled} />
      </Card>
      <Card className="max-w-lg">
        <LanguageToggle />
      </Card>
      <AdminRoleAssignment initialGrantedAdmins={grantedAdminItems} />
    </div>
  );
}
