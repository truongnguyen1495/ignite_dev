"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2 } from "lucide-react";
import type { Level } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { LEVEL_LABELS, ORDERED_LEVELS } from "@/lib/levels";
import {
  setAdminAccountStatusAction,
  deleteAdminAccountAction,
  convertAdminOnlyAccountAction,
  removeFromAdminListAction,
} from "../actions";

export function ToggleAdminStatusButton({ adminId, locked }: { adminId: string; locked: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setAdminAccountStatusAction(adminId, !locked);
          router.refresh();
        });
      }}
    >
      {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      {pending ? "Đang xử lý..." : locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
    </Button>
  );
}

// Only rendered for a real học viên (adminOnly false) — "xóa tài khoản
// admin" here can never mean deleting the underlying student account (that
// stays exclusively /admin/students' call), just stripping every trace of
// admin capability so it goes back to being a plain học viên, AND removing
// it from /admin/admins entirely (removeFromAdminListAction) — distinct
// from the list page's plain revoke-all icon, which deliberately keeps the
// row visible with a Restore option instead.
export function RemoveAdminRoleButton({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const onClick = async () => {
    const ok = await confirm({
      title: `Xóa tài khoản admin của "${adminName}"?`,
      description:
        "Tài khoản sẽ mất hết quyền admin và không còn hiện trong danh sách Quản lý Admin nữa — về lại làm học viên bình thường, cấp độ và dữ liệu học tập được giữ nguyên. Muốn cấp lại thì tìm qua \"Thêm admin\".",
      confirmLabel: "Xóa tài khoản admin",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await removeFromAdminListAction(adminId);
      router.push("/admin/admins");
    });
  };

  return (
    <Button type="button" variant="danger" disabled={pending} onClick={onClick}>
      <Trash2 className="h-4 w-4" />
      {pending ? "Đang xử lý..." : "Xóa tài khoản admin"}
    </Button>
  );
}

type Mode = "delete" | "to_hocsinh" | "to_hocvien";

// Only rendered for an adminOnly account (no real student identity) —
// unlike RemoveAdminRoleButton above, there's no underlying học viên to
// "go back to", so the admin picks explicitly between deleting the account
// outright or turning it into a genuine học sinh/học viên (see
// convertAdminOnlyAccountAction — always strips admin capability either way).
export function DeleteAdminAccountButton({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("delete");
  const [level, setLevel] = useState<Level | "">("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(undefined);
    if (mode === "to_hocvien" && !level) {
      setError("Vui lòng chọn cấp độ.");
      return;
    }
    startTransition(async () => {
      const result =
        mode === "delete"
          ? await deleteAdminAccountAction(adminId)
          : await convertAdminOnlyAccountAction(adminId, mode === "to_hocsinh" ? "HOC_SINH" : "HOC_VIEN", level || undefined);
      if (typeof result === "string") {
        setError(result);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="danger" disabled={pending} onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Xóa tài khoản admin
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-foreground">Xóa tài khoản admin &quot;{adminName}&quot;</h2>
              <p className="mt-1 text-sm text-muted">
                Tài khoản này không phải học viên/học sinh thật — chọn một trong các lựa chọn dưới đây.
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5 accent-danger"
                  checked={mode === "delete"}
                  onChange={() => setMode("delete")}
                />
                <span>
                  <span className="block font-medium text-foreground">Xóa tài khoản hoàn toàn</span>
                  <span className="block text-xs text-muted">Xóa vĩnh viễn, không thể khôi phục.</span>
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5 accent-primary"
                  checked={mode === "to_hocsinh"}
                  onChange={() => setMode("to_hocsinh")}
                />
                <span>
                  <span className="block font-medium text-foreground">Chuyển thành Học sinh</span>
                  <span className="block text-xs text-muted">
                    Không còn là admin — trở thành tài khoản học sinh (chưa xếp cấp) bình thường.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5 accent-primary"
                  checked={mode === "to_hocvien"}
                  onChange={() => setMode("to_hocvien")}
                />
                <span className="flex-1">
                  <span className="block font-medium text-foreground">Chuyển thành Học viên (5 cấp)</span>
                  <span className="block text-xs text-muted">Không còn là admin — chọn cấp độ bắt đầu.</span>
                  {mode === "to_hocvien" && (
                    <Select
                      className="mt-2"
                      value={level}
                      onChange={(e) => setLevel(e.target.value as Level)}
                    >
                      <option value="">— Chọn cấp độ —</option>
                      {ORDERED_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {LEVEL_LABELS[l]}
                        </option>
                      ))}
                    </Select>
                  )}
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="button" variant={mode === "delete" ? "danger" : "primary"} disabled={pending} isLoading={pending} onClick={submit}>
                {pending ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
