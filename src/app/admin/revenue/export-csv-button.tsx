"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORDER_ITEM_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { REFUND_REASON_LABELS } from "@/lib/refund-labels";
import type { RevenueReport } from "@/lib/revenue";

// Wraps a field in double quotes and doubles any quote inside it whenever it
// contains a comma, quote or newline — the one rule that keeps a CSV cell
// unambiguous (RFC 4180). Left bare otherwise so a plain number/date doesn't
// pick up quotes it doesn't need.
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

function buildCsv(report: RevenueReport): string {
  const lines: string[] = [];

  lines.push(csvRow(["Doanh thu", `${report.rangeFromISO} → ${report.rangeToISO}`]));
  lines.push("");

  lines.push(csvRow(["Tổng quan"]));
  lines.push(csvRow(["Doanh thu ròng", report.net]));
  lines.push(csvRow(["Doanh thu gộp", report.gross]));
  lines.push(csvRow(["Số đơn đã thanh toán", report.paidOrderCount]));
  lines.push(csvRow(["Giá trị đơn trung bình", report.aov]));
  lines.push(csvRow(["Tổng hoàn tiền", report.refundTotal]));
  lines.push(csvRow(["Số lượt hoàn tiền", report.refundCount]));
  lines.push(csvRow(["Đang chờ xử lý (PENDING + AWAITING_COD)", report.pending.totalAmount]));
  lines.push("");

  lines.push(csvRow(["Doanh thu theo ngày"]));
  lines.push(csvRow(["Ngày", "Doanh thu"]));
  for (const d of report.daily) lines.push(csvRow([d.dateISO, d.amount]));
  lines.push("");

  lines.push(csvRow(["Theo loại sản phẩm"]));
  lines.push(csvRow(["Loại", "Doanh thu"]));
  for (const k of report.byProductKind) lines.push(csvRow([ORDER_ITEM_KIND_LABELS[k.kind], k.amount]));
  lines.push("");

  lines.push(csvRow(["Theo phương thức thanh toán"]));
  lines.push(csvRow(["Phương thức", "Doanh thu", "Số đơn"]));
  for (const p of report.byPaymentMethod) lines.push(csvRow([PAYMENT_METHOD_LABELS[p.method], p.amount, p.count]));
  lines.push("");

  lines.push(csvRow(["Lý do hoàn tiền"]));
  lines.push(csvRow(["Lý do", "Số tiền", "Số lượt"]));
  for (const r of report.byRefundReason) lines.push(csvRow([REFUND_REASON_LABELS[r.reason], r.amount, r.count]));
  lines.push("");

  lines.push(csvRow(["Sản phẩm bán chạy nhất"]));
  lines.push(csvRow(["Sản phẩm", "Loại", "Lượt mua", "Doanh thu"]));
  for (const p of report.topProducts) {
    lines.push(csvRow([p.title, ORDER_ITEM_KIND_LABELS[p.kind], p.quantity, p.amount]));
  }

  // BOM so Excel (still the most common opener in VN offices) detects UTF-8
  // instead of guessing an ANSI codepage and mangling every Vietnamese diacritic.
  return `﻿${lines.join("\r\n")}`;
}

export function ExportCsvButton({ report }: { report: RevenueReport }) {
  function handleExport() {
    const csv = buildCsv(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `doanh-thu_${report.rangeFromISO}_${report.rangeToISO}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Deferred rather than immediate — revoking the URL in the same tick as
    // click() has a history of racing the download start in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4" />
      Xuất CSV
    </Button>
  );
}
