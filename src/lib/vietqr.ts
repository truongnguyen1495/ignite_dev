import { findVietQrBin } from "@/lib/vietqr-banks";

// Builds a per-order dynamic VietQR image URL via the free img.vietqr.io
// service — the QR encodes the bank, account number, exact amount, and
// transfer content, so a banking app scanning it pre-fills everything and
// the customer no longer has to hand-type the order code. Returns null (the
// caller falls back to the static Settings.bankQrImageUrl instead) whenever
// any required piece is missing — most commonly bankName not matching a
// known VietQR bank yet (see findVietQrBin), since bankName started as free
// text before this feature and an admin may not have re-selected it yet.
export function buildVietQrImageUrl({
  bankName,
  accountNumber,
  accountHolder,
  amount,
  content,
}: {
  bankName: string | null | undefined;
  accountNumber: string | null | undefined;
  accountHolder: string | null | undefined;
  amount: number;
  content: string;
}): string | null {
  const bin = findVietQrBin(bankName);
  if (!bin || !accountNumber) return null;

  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: content,
  });
  if (accountHolder) params.set("accountName", accountHolder);

  // qr_only rather than compact2: compact2 draws the bank logo, the account
  // number, the holder's name and the amount as text around the code, all of
  // which the page already lists underneath in copyable fields. Printing them
  // twice made the code itself small and the card busy — and the text baked
  // into an image can't be copied anyway. Everything still travels inside the
  // QR payload (amount and addInfo below), so what a banking app pre-fills is
  // unchanged; only the picture is quieter.
  return `https://img.vietqr.io/image/${bin}-${accountNumber}-qr_only.png?${params.toString()}`;
}
