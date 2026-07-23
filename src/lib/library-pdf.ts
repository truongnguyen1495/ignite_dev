import "server-only";
import { PDFDocument } from "pdf-lib";

// ignoreEncryption: true — safe here because getPageCount() only walks the
// page-tree structure, never the (possibly still-encrypted) content
// streams. Some PDFs (often ones exported with print/copy restrictions but
// no open password) carry encryption that every normal viewer decrypts
// transparently, but pdf-lib refuses to even open by default.
export async function getPdfPageCount(bytes: Uint8Array | Buffer): Promise<number> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

// Builds a standalone PDF containing only the first `pages` pages of the
// source — a genuinely separate, smaller file (not a client-side page
// limit), since the guest preview route serves exactly and only these bytes.
//
// Deliberately NOT using ignoreEncryption here (unlike getPdfPageCount
// above): copyPages() below reads actual page *content* streams, and
// pdf-lib doesn't implement real decryption — ignoreEncryption only skips
// its own guard, so it would copy the still-encrypted ciphertext bytes
// into a new, nominally-unencrypted document. Every reader (this app's
// pdfjs flipbook and even the plain browser PDF viewer) then fails to
// decode that "PDF" — confirmed the hard way with a real production file
// where both viewers rendered nothing but blank pages. Better to fail
// loudly here (see the callers in admin/library/actions.ts) than to
// silently hand guests a corrupted trial preview.
export async function extractFirstPages(bytes: Uint8Array | Buffer, pages: number): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes);
  const pageCount = Math.min(pages, source.getPageCount());

  const output = await PDFDocument.create();
  const copiedPages = await output.copyPages(
    source,
    Array.from({ length: pageCount }, (_, i) => i)
  );
  copiedPages.forEach((page) => output.addPage(page));

  return output.save();
}
