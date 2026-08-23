import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { Table } from "@/components/ui/table";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import { PayoutRequestActions } from "./payout-request-actions";

export default async function AdminVendorPayoutsPage() {
  await requireAdminPermission("MANAGE_VENDORS");

  const payoutRequests = await prisma.payoutRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { requestedAt: "asc" },
    include: {
      vendor: { select: { id: true, shopName: true, bankName: true, bankAccountNumber: true, bankAccountHolder: true } },
    },
  });

  return (
    <div className="space-y-6">
      <BackLink href="/admin/vendors">Nhà bán hàng</BackLink>
      <PageHeader title="Yêu cầu rút tiền" description={`${payoutRequests.length} yêu cầu đang chờ xử lý`} />

      <div className="rounded-xl border border-border bg-surface">
        {payoutRequests.length === 0 ? (
          <p className="p-6 text-sm text-muted">Không có yêu cầu rút tiền nào đang chờ.</p>
        ) : (
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Gian hàng</th>
                <th className="hidden py-2 font-medium sm:table-cell">Tài khoản nhận</th>
                <th className="py-2 font-medium">Ngày yêu cầu</th>
                <th className="py-2 text-right font-medium">Số tiền</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payoutRequests.map((request) => (
                <tr key={request.id}>
                  <td className="py-2.5 pl-4 font-medium text-foreground">{request.vendor.shopName}</td>
                  <td className="hidden py-2.5 text-xs text-muted sm:table-cell">
                    {request.vendor.bankName
                      ? `${request.vendor.bankName} · ${request.vendor.bankAccountNumber} · ${request.vendor.bankAccountHolder}`
                      : "Chưa cập nhật"}
                  </td>
                  <td className="py-2.5 text-muted">{formatDateVN(request.requestedAt)}</td>
                  <td className="py-2.5 text-right tabular-nums text-foreground">{formatVND(request.amount)}</td>
                  <td className="py-2.5 pr-4">
                    <PayoutRequestActions payoutRequestId={request.id} amountLabel={formatVND(request.amount)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
