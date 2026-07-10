import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" />
      <Card className="max-w-sm">
        <p className="text-sm text-muted">Chưa có mục cài đặt nào.</p>
      </Card>
    </div>
  );
}
