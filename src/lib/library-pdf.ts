import "server-only";
import { PDFDocument } from "pdf-lib";

// ignoreEncryption: true — some PDFs (often ones exported with print/copy
// restrictions but no open password) carry owner-password encryption that
// every normal viewer opens without a prompt, but pdf-lib refuses by
// default. We only read page geometry/content here, never re-save an
// encrypted file's original bytes, so ignoring that restriction is safe.
export async function getPdfPageCount(bytes: Uint8Array | Buffer): Promise<number> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

// Builds a standalone PDF containing only the first `pages` pages of the
// source — a genuinely separate, smaller file (not a client-side page
// limit), since the guest preview route serves exactly and only these bytes.
export async function extractFirstPages(bytes: Uint8Array | Buffer, pages: number): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = Math.min(pages, source.getPageCount());

  const output = await PDFDocument.create();
  const copiedPages = await output.copyPages(
    source,
    Array.from({ length: pageCount }, (_, i) => i)
  );
  copiedPages.forEach((page) => output.addPage(page));

  return output.save();
}
