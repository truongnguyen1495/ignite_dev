import "server-only";
import readXlsxFile from "read-excel-file/node";
import { parseSheetRows, type CellValue, type ImportRow } from "@/lib/network-import";
import { foldName } from "@/lib/network-tree";

// Opening the .xlsx needs Node (it unzips the workbook), so this is the one
// part of the import that cannot run in the browser. Everything after it
// (header detection, matching names, the plan) is the pure code in
// network-import.ts, which the browser reuses for the live preview.

export type PreviewSheet = { name: string; rows: ImportRow[] };

export type ImportPreview = {
  /** Sheets that have the columns we need and at least one person. */
  sheets: PreviewSheet[];
  /** The summary sheet when there is one ("TỔNG"), else the biggest. */
  defaultSheet: string | null;
  /** Sheets we could not use, with what they lack, so the admin can see why. */
  unusable: { name: string; missingColumns: string[] }[];
};

export async function readImportFile(buffer: Buffer): Promise<ImportPreview> {
  const workbook = await readXlsxFile(buffer);

  const sheets: PreviewSheet[] = [];
  const unusable: ImportPreview["unusable"] = [];
  for (const { sheet, data } of workbook) {
    // The library types a date cell as the Date constructor; at runtime it is a Date.
    const parsed = parseSheetRows(data as unknown as CellValue[][]);
    if (parsed.missingColumns.length > 0) {
      // A sheet with no people at all (a scratch tab) is not worth mentioning.
      if (data.length > 0) unusable.push({ name: sheet, missingColumns: parsed.missingColumns });
    } else if (parsed.rows.length > 0) {
      sheets.push({ name: sheet, rows: parsed.rows });
    }
  }

  const summary = sheets.find((s) => foldName(s.name) === "TONG");
  const biggest = [...sheets].sort((a, b) => b.rows.length - a.rows.length)[0];
  return { sheets, defaultSheet: (summary ?? biggest)?.name ?? null, unusable };
}
