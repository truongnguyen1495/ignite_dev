import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ChatToggle } from "./chat-toggle";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" />
      <Card className="max-w-lg">
        <ChatToggle chatEnabled={settings.chatEnabled} />
      </Card>
    </div>
  );
}
