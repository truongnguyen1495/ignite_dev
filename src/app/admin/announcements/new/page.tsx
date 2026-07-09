import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { CreateAnnouncementForm } from "./create-announcement-form";

export default function NewAnnouncementPage() {
  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <BackLink href="/admin/announcements">Quay lại</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Đăng bản tin mới</h1>
      </div>
      <Card padding="lg">
        <CreateAnnouncementForm />
      </Card>
    </div>
  );
}
