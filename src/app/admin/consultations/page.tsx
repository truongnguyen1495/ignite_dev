import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateVN, formatTimeVN } from "@/lib/date";
import { ConsultationsList, type ConsultationListItem } from "./consultations-list";

export default async function AdminConsultationsPage() {
  await requireAdminPermission("MANAGE_PRODUCTS");

  const requests = await prisma.consultationRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: { select: { title: true } }, student: { select: { name: true, email: true } } },
  });

  const items: ConsultationListItem[] = requests.map((r) => ({
    id: r.id,
    productTitle: r.product.title,
    studentName: r.student.name,
    studentEmail: r.student.email,
    name: r.name,
    phone: r.phone,
    preferredTime: r.preferredTime,
    createdAtLabel: `${formatDateVN(r.createdAt)} ${formatTimeVN(r.createdAt)}`,
    contacted: r.contactedAt !== null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tư vấn"
        description="Yêu cầu đặt lịch tư vấn từ trang sản phẩm — liên hệ theo khung giờ khách mong muốn."
      />
      <ConsultationsList items={items} />
    </div>
  );
}
