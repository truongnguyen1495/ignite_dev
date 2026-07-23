// Curated subset of Vietnamese banks supported by the VietQR/Napas network,
// cross-checked against https://api.vietqr.io/v2/banks. `label` is the exact
// string stored in Settings.bankName (shown as-is everywhere the app already
// displays "Ngân hàng: {settings.bankName}") and also the <select> value, so
// looking up a bin is a plain exact-match lookup — no fuzzy text matching
// needed, unlike when bankName was free text. Adding a bank later just means
// appending a row here; nothing else needs to change.
export const VIETQR_BANKS: { label: string; bin: string }[] = [
  { label: "Vietcombank", bin: "970436" },
  { label: "VietinBank", bin: "970415" },
  { label: "BIDV", bin: "970418" },
  { label: "Agribank", bin: "970405" },
  { label: "Techcombank", bin: "970407" },
  { label: "MB Bank", bin: "970422" },
  { label: "ACB", bin: "970416" },
  { label: "VPBank", bin: "970432" },
  { label: "TPBank", bin: "970423" },
  { label: "Sacombank", bin: "970403" },
  { label: "HDBank", bin: "970437" },
  { label: "VIB", bin: "970441" },
  { label: "SHB", bin: "970443" },
  { label: "SeABank", bin: "970440" },
  { label: "OCB", bin: "970448" },
  { label: "MSB", bin: "970426" },
  { label: "Eximbank", bin: "970431" },
  { label: "LienVietPostBank (LPBank)", bin: "970449" },
  { label: "Nam A Bank", bin: "970428" },
  { label: "SCB", bin: "970429" },
  { label: "ABBank", bin: "970425" },
  { label: "Bac A Bank", bin: "970409" },
  { label: "PVcomBank", bin: "970412" },
  { label: "VietCapitalBank (BVBank)", bin: "970454" },
  { label: "KienlongBank", bin: "970452" },
  { label: "BaoVietBank", bin: "970438" },
  { label: "VietABank", bin: "970427" },
  { label: "GPBank", bin: "970408" },
  { label: "PGBank", bin: "970430" },
  { label: "Saigonbank", bin: "970400" },
  { label: "Public Bank Vietnam", bin: "970439" },
  { label: "Woori Bank", bin: "970457" },
  { label: "Shinhan Bank", bin: "970424" },
  { label: "CBBank", bin: "970444" },
];

export function findVietQrBin(bankName: string | null | undefined): string | null {
  if (!bankName) return null;
  return VIETQR_BANKS.find((b) => b.label === bankName)?.bin ?? null;
}
