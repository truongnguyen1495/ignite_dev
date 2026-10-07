"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { commitImportAction, previewImportAction } from "@/app/admin/team-network/actions";
import { planImport, type ExistingMember, type ImportPlan, type Resolution } from "@/lib/network-import";
import type { ImportPreview } from "@/lib/network-import-read";
import type { ImportResult } from "@/lib/network";
import type { NetworkMemberLite } from "@/lib/network-tree";
import { ACTION_FAILED_MESSAGE } from "./network-ui";

type Step = "file" | "check" | "confirm" | "done";

// The admin's pick for a name that matches nobody. "suggest" is only offered
// when exactly one person looks right.
type Choice = "suggest" | "blank" | "create";

const STEPS: { id: Exclude<Step, "done">; label: string }[] = [
  { id: "file", label: "Chọn file" },
  { id: "check", label: "Kiểm tra" },
  { id: "confirm", label: "Xác nhận" },
];

const COLUMN_MAP: { from: string; to: string; used: boolean }[] = [
  { from: "Họ Ten", to: "Họ tên", used: true },
  { from: "TEAM", to: "Team", used: true },
  { from: "REFERRAL", to: "Người giới thiệu · khớp theo tên", used: true },
  { from: "IGNITE ID", to: "RapidX ID", used: true },
  { from: "Lead/Active/Inactive/Customer", to: "Trạng thái", used: true },
  { from: "Leader", to: "Leader · khớp theo tên. “LN” là gốc, “-” là chưa có Leader", used: true },
  { from: "TAT tuần…", to: "Không nhập ở giai đoạn này", used: false },
  { from: "STT", to: "Bỏ qua", used: false },
];

function Stat({ value, label, tone = "ok" }: { value: number; label: string; tone?: "ok" | "warn" }) {
  return (
    <div className={`rounded-lg border bg-background px-3 py-2.5 ${tone === "warn" ? "border-warning-border" : "border-border"}`}>
      <p className={`text-xl font-bold tabular-nums ${tone === "warn" ? "text-warning" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

// Reading the file happens on the server (it unzips the workbook); everything
// after that — matching names, working out what would be created — runs here,
// live, with the same planner the server re-runs before it writes. So moving a
// dropdown updates the numbers instantly, and a committed import can only be
// one the server also accepts.
export function ImportWizard({
  members,
  onDone,
  onClose,
}: {
  members: readonly NetworkMemberLite[];
  /** Called after a successful import so the page can reload the members. */
  onDone: () => void;
  onClose: () => void;
}) {
  const uid = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice | undefined>>({});
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => preview?.sheets.find((s) => s.name === sheet)?.rows ?? [], [preview, sheet]);
  const existing = useMemo<ExistingMember[]>(
    () => members.map((m) => ({ id: m.id, name: m.name, igniteId: m.igniteId, isRoot: m.isRoot })),
    [members]
  );

  // First pass finds which names are unresolved (and their suggestions); the
  // second applies the admin's picks, defaulting a name that has a single
  // suggestion to that suggestion so the common case needs no clicking.
  const { plan, resolutions } = useMemo(() => {
    const first = planImport({ rows, existing, resolutions: {} });
    const effective: Record<string, Resolution> = {};
    for (const u of first.unresolved) {
      const choice = choices[u.key] ?? (u.suggestion ? "suggest" : undefined);
      if (choice === "suggest" && u.suggestion) effective[u.key] = { kind: "member", target: u.suggestion.target };
      else if (choice === "blank") effective[u.key] = { kind: "blank" };
      else if (choice === "create") effective[u.key] = { kind: "create" };
    }
    return { plan: planImport({ rows, existing, resolutions: effective }) as ImportPlan, resolutions: effective };
  }, [rows, existing, choices]);

  const fromFile = plan.create.length - plan.stats.createdFromNames;
  const total = fromFile + plan.stats.createdFromNames + (plan.createRoot && plan.create.length > 0 ? 1 : 0);
  const nothingNew = plan.errors.length === 0 && plan.create.length === 0;
  const unresolvedLeft = plan.unresolved.filter((u) => !resolutions[u.key]).length;

  function chooseFile(file: File) {
    setError(undefined);
    setFileName(file.name);
    // Same limit the server enforces, checked here first so a big file fails at once.
    if (file.size > 900 * 1024) {
      setPreview(null);
      setError("File quá lớn (tối đa 900 KB). Hãy bỏ bớt sheet không cần thiết rồi lưu lại.");
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      form.append("file", file);
      let res: Awaited<ReturnType<typeof previewImportAction>>;
      try {
        res = await previewImportAction(form);
      } catch {
        res = { error: ACTION_FAILED_MESSAGE };
      }
      if (res.error !== undefined) {
        setError(res.error);
        setPreview(null);
        return;
      }
      setPreview(res.preview);
      setSheet(res.preview.defaultSheet);
      setChoices({});
    });
  }

  function blankAll() {
    setChoices((current) => {
      const next = { ...current };
      for (const u of plan.unresolved) if (!resolutions[u.key]) next[u.key] = "blank";
      return next;
    });
  }

  function commit() {
    setError(undefined);
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof commitImportAction>>;
      try {
        res = await commitImportAction({ rows, resolutions });
      } catch {
        res = { error: ACTION_FAILED_MESSAGE };
      }
      if (res.error !== undefined) {
        setError(res.error);
        return;
      }
      setResult(res.result);
      setStep("done");
    });
  }

  const stepIndex = step === "done" ? STEPS.length : STEPS.findIndex((s) => s.id === step);

  return (
    // Once the import has been written, leaving by any route (Escape included) must
    // reload the list: the page still holds the old one, and an empty network would
    // keep saying "Chưa có thành viên nào" over a database that is no longer empty.
    <ModalShell onClose={() => (pending ? undefined : step === "done" ? onDone() : onClose())} labelledBy={`${uid}-title`} wide scrollable closeOnBackdrop={false}>
      <h2 id={`${uid}-title`} className="text-base font-semibold text-foreground">
        Nhập từ Excel
      </h2>

      <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Các bước">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === stepIndex ? "step" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              i < stepIndex
                ? "border-success-border text-success"
                : i === stepIndex
                  ? "border-primary bg-primary-bg font-semibold text-primary"
                  : "border-border text-muted"
            }`}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {step === "file" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary-border bg-primary-bg px-4 py-4">
            <FileSpreadsheet className="h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{fileName ?? "Chưa chọn file"}</p>
              <p className="text-xs text-muted">
                {pending
                  ? "Đang đọc file…"
                  : preview
                    ? `${preview.sheets.length} sheet dùng được, ${rows.length} người ở sheet “${sheet}”`
                    : "File .xlsx, tối đa 900 KB."}
              </p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              aria-label="Chọn file Excel"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) chooseFile(file);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => fileInput.current?.click()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {fileName ? "Chọn file khác" : "Chọn file"}
            </Button>
          </div>

          {preview && preview.sheets.length > 1 && (
            <Select id={`${uid}-sheet`} label="Sheet chứa danh sách" value={sheet ?? ""} onChange={(e) => { setSheet(e.target.value); setChoices({}); }}>
              {preview.sheets.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.rows.length} người)
                </option>
              ))}
            </Select>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Cột nhận diện được</p>
            <table className="w-full text-sm">
              <tbody>
                {COLUMN_MAP.map((c) => (
                  <tr key={c.from} className="border-b border-border last:border-0">
                    <td className={`py-1.5 pr-2 ${c.used ? "text-foreground" : "text-muted"}`}>{c.from}</td>
                    <td className="w-6 text-center text-faint">→</td>
                    <td className={`py-1.5 pl-2 ${c.used ? "text-foreground" : "text-muted"}`}>{c.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Chưa ghi gì vào hệ thống cho tới bước xác nhận. Sau khi nhập, bạn chỉnh sửa trực tiếp trên app; file Excel không còn là nơi cập nhật.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button type="button" disabled={!preview || rows.length === 0 || pending} onClick={() => setStep("check")}>
              Kiểm tra dữ liệu
            </Button>
          </div>
        </div>
      )}

      {step === "check" && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat value={plan.totalRows} label="dòng đọc được" />
            <Stat value={plan.stats.leaderIsRoot} label="Leader là LN, gắn vào gốc" />
            <Stat value={plan.stats.unassigned} label="chưa có Leader, vào UNASSIGNED" tone={plan.stats.unassigned > 0 ? "warn" : "ok"} />
            <Stat value={plan.stats.missingId} label="thiếu RapidX ID, để trống" tone={plan.stats.missingId > 0 ? "warn" : "ok"} />
            <Stat value={plan.skipped.length} label="đã có trong hệ thống, bỏ qua" />
            <Stat value={plan.errors.length} label="lỗi cần sửa trong file" tone={plan.errors.length > 0 ? "warn" : "ok"} />
          </div>

          {plan.errors.length > 0 && (
            <div role="alert" className="max-h-44 overflow-y-auto rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
              <p className="mb-1 font-semibold">Hãy sửa các lỗi này trong file Excel rồi chọn lại file:</p>
              <ul className="list-disc space-y-1 pl-5">
                {plan.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
              {plan.errors.length > 20 && <p className="mt-1">…và {plan.errors.length - 20} lỗi khác.</p>}
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Người giới thiệu và Leader</p>
            <p className="mb-2 text-sm text-muted">
              <b className="text-foreground">{plan.stats.referrerLinked}</b> dòng có người giới thiệu khớp tự động (đã bỏ qua khác biệt dấu).
              {plan.unresolved.length > 0 ? (
                <>
                  {" "}
                  <b className="text-warning">
                    {plan.unresolved.reduce((sum, u) => sum + u.rows, 0)} dòng ({plan.unresolved.length} tên)
                  </b>{" "}
                  chưa khớp với ai trong file, cần bạn chọn cách xử lý:
                </>
              ) : (
                " Không có tên nào chưa khớp."
              )}
            </p>

            {plan.unresolved.length > 0 && (
              <>
                <table className="w-full text-sm">
                  <tbody>
                    {plan.unresolved.map((u) => {
                      const value = choices[u.key] ?? (u.suggestion ? "suggest" : "");
                      return (
                        <tr key={u.key} className="border-b border-border last:border-0">
                          <td className="py-2 pr-3 align-middle">
                            <p className="font-semibold text-foreground">{u.name}</p>
                            <p className="text-xs text-muted">
                              {u.field === "leader" ? "Cột Leader" : "Cột người giới thiệu"} · {u.rows} dòng
                            </p>
                          </td>
                          <td className="w-[55%] py-2">
                            <Select
                              id={`${uid}-${u.key}`}
                              aria-label={`Cách xử lý ${u.name}`}
                              value={value}
                              onChange={(e) => setChoices((c) => ({ ...c, [u.key]: (e.target.value || undefined) as Choice | undefined }))}
                            >
                              <option value="">Chọn cách xử lý…</option>
                              {u.suggestion && <option value="suggest">Gộp vào {u.suggestion.label} (gợi ý)</option>}
                              <option value="blank">Bỏ trống</option>
                              <option value="create">Tạo thành viên mới tên này</option>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted">
                  Chọn sai cũng không sao: sau khi nhập, bạn sửa lại người giới thiệu của từng người ngay trong Team Network.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {unresolvedLeft > 0 && (
              <button
                type="button"
                className="mr-auto text-sm font-medium text-primary hover:text-primary-hover"
                onClick={blankAll}
              >
                Bỏ trống tất cả {unresolvedLeft} tên chưa chọn
              </button>
            )}
            <Button type="button" variant="secondary" onClick={() => setStep("file")}>
              Quay lại
            </Button>
            <Button type="button" disabled={!plan.ready || nothingNew} onClick={() => setStep("confirm")}>
              Tiếp tục
            </Button>
          </div>
          {nothingNew && <p className="text-right text-xs text-muted">Mọi người trong file đã có trong hệ thống, không có gì để nhập.</p>}
        </div>
      )}

      {step === "confirm" && (
        <div className="mt-4 space-y-4">
          <ul className="space-y-2 text-sm text-muted">
            <li>
              Tạo <b className="text-foreground">{total}</b> thành viên: {fromFile} người trong file
              {plan.createRoot && plan.create.length > 0 ? ", 1 gốc “LN” chưa có trong file" : ""}
              {plan.stats.createdFromNames > 0 ? `, ${plan.stats.createdFromNames} người ngoài đội` : ""}.
            </li>
            <li>
              <b className="text-foreground">{plan.stats.unassigned}</b> người vào UNASSIGNED,{" "}
              <b className="text-foreground">{plan.stats.leaderIsRoot}</b> Leader gắn dưới LN.
            </li>
            <li>
              Người giới thiệu: <b className="text-foreground">{plan.stats.referrerLinked}</b> có liên kết, {plan.stats.referrerBlank} để trống.
            </li>
            <li>Mỗi người có một dòng lịch sử trạng thái đầu tiên, ghi “Nhập từ Excel”.</li>
            <li>{plan.skipped.length > 0 ? `${plan.skipped.length} người đã có trong hệ thống được bỏ qua, không ghi đè. ` : ""}Không tạo hay thay đổi tài khoản đăng nhập nào.</li>
          </ul>

          {error && (
            <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setStep("check")}>
              Quay lại
            </Button>
            <Button type="button" isLoading={pending} onClick={commit}>
              Nhập {total} thành viên
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-foreground">
              Đã nhập {result.created + (result.createdRoot ? 1 : 0)} thành viên
            </p>
            <p className="text-sm text-muted">
              {plan.stats.unassigned > 0 ? `${plan.stats.unassigned} người đang ở UNASSIGNED, chờ bạn gán Leader.` : "Cây đã sẵn sàng."}
              {result.skipped > 0 ? ` ${result.skipped} người đã có nên được bỏ qua.` : ""}
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={onDone}>
              Xem trong Team Network
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
