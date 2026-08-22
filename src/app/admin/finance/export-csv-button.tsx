"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinanceReport } from "@/lib/finance";
import { FINANCE_CATEGORY_LABELS } from "@/lib/finance-labels";

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

// Exports the ledger (manual entries) only, matching what "Sổ giao dịch"
// shows — sales revenue already has its own CSV export at /admin/revenue,
// so it isn't repeated here to avoid two files disagreeing on the same money.
function buildCsv(report: FinanceReport): string {
  const lines: string[] = [];

  lines.push(csvRow(["Thu chi", `${report.rangeFromISO} → ${report.rangeToISO}`]));
  lines.push("");

  lines.push(csvRow(["Tổng quan"]));
  lines.push(csvRow(["Tổng thu (bán hàng + thu khác)", report.totalIncome]));
  lines.push(csvRow(["  trong đó bán hàng", report.salesRevenue]));
  lines.push(csvRow(["  trong đó thu khác (nhập tay)", report.manualIncome]));
  lines.push(csvRow(["Tổng chi", report.totalExpense]));
  lines.push(csvRow(["Lợi nhuận ròng", report.netProfit]));
  lines.push(csvRow(["Biên lợi nhuận (%)", report.marginPct.toFixed(1)]));
  lines.push("");

  lines.push(csvRow(["Sổ giao dịch (khoản nhập tay)"]));
  lines.push(csvRow(["Ngày", "Loại", "Danh mục", "Ghi chú", "Số tiền", "Người tạo"]));
  for (const e of report.ledger) {
    lines.push(
      csvRow([
        e.occurredAtISO,
        e.type === "INCOME" ? "Thu" : "Chi",
        FINANCE_CATEGORY_LABELS[e.category],
        e.note,
        e.amount,
        e.createdByName,
      ])
    );
  }

  // BOM so Excel (still the most common opener in VN offices) detects UTF-8
  // instead of guessing an ANSI codepage and mangling every Vietnamese diacritic.
  return `﻿${lines.join("\r\n")}`;
}

export function ExportCsvButton({ report }: { report: FinanceReport }) {
  function handleExport() {
    const csv = buildCsv(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `thu-chi_${report.rangeFromISO}_${report.rangeToISO}.csv`;
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
