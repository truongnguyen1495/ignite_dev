import { requireVendorAccountAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { VendorComposer } from "./vendor-composer";

export default async function VendorNewListingPage() {
  await requireVendorAccountAccess();

  return (
    <div className="space-y-6">
      <BackLink href="/vendor/san-pham">Sản phẩm của tôi</BackLink>
      <PageHeader
        title="Đăng sản phẩm mới"
        description="Đăng lên là hiển thị ngay cho học viên & khách xem — không chờ duyệt riêng."
      />
      <VendorComposer />
    </div>
  );
}
