import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, passPercentage: 80 },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Cài đặt</h1>
      <div className="max-w-sm rounded-xl border border-border bg-surface p-6">
        <SettingsForm passPercentage={settings.passPercentage} />
      </div>
    </div>
  );
}
