import Link from "next/link";
import { UserCog, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireActiveSuperAdmin } from "@/lib/access";
import { getDictionary } from "@/lib/i18n/get-locale";
import { ChatToggle } from "./chat-toggle";
import { RegistrationToggle } from "./registration-toggle";
import { LanguageToggle } from "./language-toggle";
import { SalesToggle } from "./sales-toggle";
import { EmailVerificationToggle } from "./email-verification-toggle";
import { GoogleLoginToggle } from "./google-login-toggle";
import { BankInfoForm } from "./bank-info-form";

export default async function SettingsPage() {
  await requireActiveSuperAdmin();
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const { t } = await getDictionary();

  return (
    <div className="space-y-6">
      <PageHeader title={t.settingsPage.title} />
      <Card className="max-w-lg">
        <ChatToggle chatEnabled={settings.chatEnabled} />
      </Card>
      <Card className="max-w-lg">
        <RegistrationToggle registrationEnabled={settings.registrationEnabled} />
      </Card>
      <Card className="max-w-lg">
        <LanguageToggle bilingualEnabled={settings.bilingualEnabled} />
      </Card>
      <Card className="max-w-lg">
        <SalesToggle salesEnabled={settings.salesEnabled} />
      </Card>
      <Card className="max-w-lg">
        <EmailVerificationToggle emailVerificationEnabled={settings.emailVerificationEnabled} />
      </Card>
      <Card className="max-w-lg">
        <GoogleLoginToggle googleLoginEnabled={settings.googleLoginEnabled} />
      </Card>
      <Card className="max-w-lg">
        <BankInfoForm
          bankName={settings.bankName}
          bankAccountNumber={settings.bankAccountNumber}
          bankAccountHolder={settings.bankAccountHolder}
          bankQrImageUrl={settings.bankQrImageUrl}
        />
      </Card>
      <Link
        href="/admin/admins"
        className="flex max-w-lg items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserCog className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{t.settingsPage.adminManagementTitle}</p>
          <p className="text-xs text-muted">{t.settingsPage.adminManagementDescription}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Link>
    </div>
  );
}
