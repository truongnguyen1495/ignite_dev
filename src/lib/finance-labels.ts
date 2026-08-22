import type { FinanceCategory, FinanceEntryType } from "@prisma/client";

// Split out from finance.ts (which is "server-only") so client components —
// the add-entry modal's category <select>, the CSV export, the ledger table
// — can import these labels/lists without dragging getFinanceReport's DB
// access into the client bundle. Same split revenue.ts already relies on via
// ORDER_ITEM_KIND_LABELS/PAYMENT_METHOD_LABELS living in orders.ts instead
// of revenue.ts itself.

export const EXPENSE_CATEGORIES: FinanceCategory[] = [
  "SALARY",
  "OPERATIONS",
  "MARKETING",
  "COMMISSION_PAYOUT",
  "OTHER_EXPENSE",
];

// Manual "thu khác" only — sales revenue never gets a category here, it comes
// straight from Order and is folded into totalIncome at read time (see
// getFinanceReport in finance.ts), never duplicated into a FinanceEntry row.
export const INCOME_CATEGORIES: FinanceCategory[] = ["BANK_INTEREST", "DEBT_RECOVERY", "OTHER_INCOME"];

export const FINANCE_CATEGORY_LABELS: Record<FinanceCategory, string> = {
  BANK_INTEREST: "Lãi ngân hàng",
  DEBT_RECOVERY: "Thu hồi nợ",
  OTHER_INCOME: "Thu khác",
  SALARY: "Lương",
  OPERATIONS: "Vận hành",
  MARKETING: "Marketing",
  COMMISSION_PAYOUT: "Hoa hồng đã trả",
  OTHER_EXPENSE: "Chi khác",
};

export function categoriesForType(type: FinanceEntryType): FinanceCategory[] {
  return type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export function isValidCategoryForType(category: string, type: FinanceEntryType): category is FinanceCategory {
  return (categoriesForType(type) as string[]).includes(category);
}
