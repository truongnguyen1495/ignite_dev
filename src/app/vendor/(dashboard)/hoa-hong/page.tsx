import { Fragment } from "react";
import Link from "next/link";
import { requireVendorAccountAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getVendorBalance } from "@/lib/vendor-commission";
import { COMMISSION_STATUS_LABELS, PAYOUT_REQUEST_STATUS_LABELS } from "@/lib/vendor";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { formatDateVN } from "@/lib/date";
import { formatOrderCode } from "@/lib/orders";
import type { CommissionStatus, PayoutRequestStatus } from "@prisma/client";
import { RequestPayoutButton } from "./request-payout-button";

const COMMISSION_BADGE_COLOR: Record<CommissionStatus, BadgeColor> = {
  PENDING: "warning",
  CONFIRMED: "success",
  PAID: "muted",
  CANCELLED: "danger",
};
const PAYOUT_BADGE_COLOR: Record<PayoutRequestStatus, BadgeColor> = {
  PENDING: "warning",
  PAID: "success",
  REJECTED: "danger",
};

export default async function VendorCommissionPage() {
  const { vendor } = await requireVendorAccountAccess();

  const balance = await getVendorBalance(vendor.id);

  const [vendorFull, commissions, payoutRequests] = await prisma.$transaction([
    prisma.vendor.findUnique({
      where: { id: vendor.id },
      select: { bankName: true, bankAccountNumber: true, bankAccountHolder: true },
    }),
    prisma.commission.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        grossAmount: true,
        commissionPercent: true,
        vendorAmount: true,
        status: true,
        createdAt: true,
        orderItem: { select: { titleSnapshot: true, order: { select: { orderNumber: true, paidAt: true } } } },
        adjustments: { select: { id: true, amount: true, createdAt: true } },
      },
    }),
    prisma.payoutRequest.findMany({
      where: { vendorId: vendor.id },
      orderBy: { requestedAt: "desc" },
      take: 20,
      select: { id: true, amount: true, status: true, requestedAt: true, processedAt: true, rejectReason: true },
    }),
  ]);

  const pendingTotal = commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.vendorAmount, 0);
  const paidTotal = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.vendorAmount, 0);
  const paidPayoutCount = payoutRequests.filter((p) => p.status === "PAID").length;

  const hasBankInfo = vendorFull?.bankName || vendorFull?.bankAccountNumber;

  return (
    <div className="space-y-6">
      <PageHeader title="Hoa hồng & Rút tiền" description="Số dư và lịch sử hoa hồng của gian hàng bạn." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Khả dụng để rút</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(balance.netAvailable)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Đang chờ xác nhận</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(pendingTotal)}</p>
          <p className="mt-2 text-xs text-muted">Đơn chưa hoàn tất</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Đã rút tổng cộng</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{formatVND(paidTotal)}</p>
          <p className="mt-2 text-xs text-muted">{paidPayoutCount} lần rút</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Đang bị trừ do hoàn đơn</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-danger">{formatVND(balance.outstandingDebt)}</p>
          <p className="mt-2 text-xs text-muted">Trừ vào lần rút kế tiếp</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Yêu cầu rút tiền</h2>
            <p className="mt-0.5 text-xs text-muted">Chuyển khoản trong 3–5 ngày làm việc.</p>
          </div>
          <RequestPayoutButton amount={balance.netAvailable} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          {hasBankInfo ? (
            <p className="text-sm text-muted">
              Chuyển tới{" "}
              <span className="font-medium text-foreground">
                {vendorFull?.bankName} · {vendorFull?.bankAccountNumber}
              </span>{" "}
              · {vendorFull?.bankAccountHolder}
            </p>
          ) : (
            <p className="text-sm text-warning">Chưa có tài khoản nhận tiền — cập nhật ở Hồ sơ gian hàng.</p>
          )}
          <Link href="/vendor/ho-so" className="text-xs font-medium text-primary hover:text-primary-hover">
            Đổi tài khoản nhận tiền
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Lịch sử hoa hồng</h2>
        </div>
        {commissions.length === 0 ? (
          <p className="p-6 text-sm text-muted">Chưa có hoa hồng nào.</p>
        ) : (
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Mã đơn</th>
                <th className="py-2 font-medium">Sản phẩm</th>
                <th className="hidden py-2 font-medium sm:table-cell">Ngày</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Giá trị đơn</th>
                <th className="py-2 text-right font-medium">Hoa hồng nhận</th>
                <th className="py-2 pr-4 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {commissions.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td className="py-2.5 pl-4 font-mono text-xs text-foreground">
                      {formatOrderCode(c.orderItem.order.orderNumber)}
                    </td>
                    <td className="py-2.5 text-foreground">{c.orderItem.titleSnapshot}</td>
                    <td className="hidden py-2.5 text-muted sm:table-cell">
                      {c.orderItem.order.paidAt ? formatDateVN(c.orderItem.order.paidAt) : formatDateVN(c.createdAt)}
                    </td>
                    <td className="hidden py-2.5 text-right tabular-nums text-muted sm:table-cell">{formatVND(c.grossAmount)}</td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {formatVND(c.vendorAmount)}{" "}
                      <span className="text-xs text-muted">({100 - c.commissionPercent}%)</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge color={COMMISSION_BADGE_COLOR[c.status]}>{COMMISSION_STATUS_LABELS[c.status]}</Badge>
                    </td>
                  </tr>
                  {c.adjustments.map((adj) => (
                    <tr key={adj.id} className="bg-danger-bg/40">
                      <td className="py-2 pl-4 text-xs text-danger" colSpan={4}>
                        ⚠ Đơn {formatOrderCode(c.orderItem.order.orderNumber)} bị khách hoàn sau khi đã nhận hoa hồng
                      </td>
                      <td className="py-2 text-right tabular-nums text-danger">{formatVND(adj.amount)}</td>
                      <td className="py-2 pr-4">
                        <Badge color="danger">Đã thu hồi</Badge>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {payoutRequests.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">Lịch sử yêu cầu rút tiền</h2>
          </div>
          <Table>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 font-medium">Ngày yêu cầu</th>
                <th className="py-2 text-right font-medium">Số tiền</th>
                <th className="py-2 font-medium">Trạng thái</th>
                <th className="py-2 pr-4 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payoutRequests.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 pl-4 text-muted">{formatDateVN(p.requestedAt)}</td>
                  <td className="py-2.5 text-right tabular-nums text-foreground">{formatVND(p.amount)}</td>
                  <td className="py-2.5">
                    <Badge color={PAYOUT_BADGE_COLOR[p.status]}>{PAYOUT_REQUEST_STATUS_LABELS[p.status]}</Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted">{p.rejectReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
