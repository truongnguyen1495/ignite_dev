import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, passPercentage: 80 },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" />
      <Card className="max-w-sm">
        <SettingsForm passPercentage={settings.passPercentage} />
      </Card>
    </div>
  );
}
