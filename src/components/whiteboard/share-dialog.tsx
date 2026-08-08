"use client";

import { useEffect, useState, useTransition } from "react";
import type { WhiteboardAccessRole } from "@prisma/client";
import { Users, Search, X, Loader2, Link2, Check } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  getWhiteboardShareInfoAction,
  searchUsersForWhiteboardShareAction,
  addWhiteboardCollaboratorAction,
  removeWhiteboardCollaboratorAction,
  updateWhiteboardCollaboratorRoleAction,
  setWhiteboardGeneralAccessAction,
  type WhiteboardUserSearchResult,
  type WhiteboardShareInfo,
} from "@/lib/whiteboard-share-actions";

const ACCOUNT_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  STUDENT: "Học viên",
};

// COMMENTER has no real functionality yet (no comment feature exists on
// this whiteboard) — it's here purely so the share picker matches Google
// Drive's own 3-tier Xem/Nhận xét/Chỉnh sửa choice; everywhere a
// WhiteboardAccessRole is actually CHECKED (requireWhiteboardAccess,
// canEditWhiteboard in access.ts), COMMENTER is treated identically to
// VIEWER. Don't build fake comment UI to make this tier "do something" —
// wire up a real comment feature first if that's ever wanted.
const SHARE_ROLE_LABEL: Record<WhiteboardAccessRole, string> = {
  VIEWER: "Người xem",
  COMMENTER: "Người nhận xét",
  EDITOR: "Người chỉnh sửa",
};
const SHARE_ROLE_OPTIONS: WhiteboardAccessRole[] = ["VIEWER", "COMMENTER", "EDITOR"];

const EMPTY_INFO: WhiteboardShareInfo = { collaborators: [], generalAccessRole: null };

// Modal shell mirrors src/components/ui/reorder-modal.tsx (fixed overlay,
// role="dialog", click-outside/X to close) — a search-and-add multi-select
// picker instead of that one's drag-to-reorder list, since no existing
// picker in this app supports adding several people to one thing (the
// closest, student-picker.tsx/existing-student-form.tsx, are single-pick
// and student-only — this one searches both admins and students). Modeled
// on Google Drive's own share dialog per real screenshots Kian provided:
// named people with a per-person role, plus a separate "general access"
// (anyone signed into this app with the link) setting below.
export function ShareDialog({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<WhiteboardShareInfo>(EMPTY_INFO);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WhiteboardUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [linkCopied, setLinkCopied] = useState(false);

  function refreshInfo() {
    setLoadingInfo(true);
    getWhiteboardShareInfoAction(boardId)
      .then(setInfo)
      .finally(() => setLoadingInfo(false));
  }

  // refreshInfo is called directly from the trigger button's own onClick
  // (below), not from a useEffect keyed on `open` — a real user event
  // handler can call setState synchronously with no issue; doing the same
  // from inside an effect body is what react-hooks's set-state-in-effect
  // rule (correctly) flags, since effects are meant to synchronize with
  // external systems, not fire on their own render.

  const visibleResults = query.trim().length >= 2 ? results : [];

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // No setState here — `visibleResults` above already masks stale
      // `results` once the query drops back under 2 chars, same pattern
      // student-picker.tsx uses for the identical case.
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setSearching(true);
      const found = await searchUsersForWhiteboardShareAction(boardId, trimmed);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, boardId]);

  function handleAdd(userId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await addWhiteboardCollaboratorAction(boardId, userId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setQuery("");
      setResults([]);
      if (result.info) setInfo(result.info);
    });
  }

  function handleRemove(collaboratorId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await removeWhiteboardCollaboratorAction(boardId, collaboratorId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.info) setInfo(result.info);
    });
  }

  function handleRoleChange(collaboratorId: string, role: WhiteboardAccessRole) {
    setError(undefined);
    // Optimistic — a <select> that visibly snaps back while waiting for the
    // round trip reads as broken; this app's other role/permission toggles
    // (e.g. admin-permissions checkboxes) don't do this, but those aren't
    // driven by a native <select> element, which re-renders its displayed
    // value from the DOM's own pending interaction, not just React state.
    setInfo((prev) => ({
      ...prev,
      collaborators: prev.collaborators.map((c) => (c.id === collaboratorId ? { ...c, shareRole: role } : c)),
    }));
    startTransition(async () => {
      const result = await updateWhiteboardCollaboratorRoleAction(boardId, collaboratorId, role);
      if (result.error) {
        setError(result.error);
        refreshInfo();
        return;
      }
      if (result.info) setInfo(result.info);
    });
  }

  function handleGeneralAccessChange(value: string) {
    setError(undefined);
    setLinkCopied(false);
    const role = value === "RESTRICTED" ? null : (value as WhiteboardAccessRole);
    setInfo((prev) => ({ ...prev, generalAccessRole: role }));
    startTransition(async () => {
      const result = await setWhiteboardGeneralAccessAction(boardId, role);
      if (result.error) {
        setError(result.error);
        refreshInfo();
        return;
      }
      if (result.info) setInfo(result.info);
    });
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/whiteboards/${boardId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          refreshInfo();
        }}
        title="Chia sẻ bảng vẽ"
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Users className="h-3.5 w-3.5" />
        Chia sẻ
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="pr-8 text-base font-semibold text-foreground">Chia sẻ bảng vẽ</h2>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Thêm người (tên hoặc email)..."
                className="w-full rounded-lg border border-border-strong bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            {searching && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Đang tìm...
              </p>
            )}
            {!searching && query.trim().length >= 2 && visibleResults.length === 0 && (
              <p className="mt-2 text-xs text-muted">Không tìm thấy ai phù hợp.</p>
            )}
            {visibleResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {visibleResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    disabled={pending}
                    onClick={() => handleAdd(user.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-2 text-left text-sm transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserAvatar src={user.avatarUrl} name={user.name} size={28} className="text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] text-muted">
                      {ACCOUNT_ROLE_LABEL[user.accountRole] ?? user.accountRole}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}

            <div className="mt-4 flex-1 overflow-y-auto border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted">Những người có quyền truy cập</p>
              {loadingInfo ? (
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
                </p>
              ) : info.collaborators.length === 0 ? (
                <p className="text-xs text-muted">Chưa chia sẻ với ai — chỉ mình bạn (và admin) truy cập được.</p>
              ) : (
                <ul className="space-y-1.5">
                  {info.collaborators.map((collab) => (
                    <li
                      key={collab.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-2 text-sm"
                    >
                      <UserAvatar src={collab.avatarUrl} name={collab.name} size={28} className="text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground">{collab.name}</p>
                        <p className="truncate text-xs text-muted">{collab.email}</p>
                      </div>
                      <span className="hidden shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] text-muted sm:inline-block">
                        {ACCOUNT_ROLE_LABEL[collab.accountRole] ?? collab.accountRole}
                      </span>
                      <select
                        value={collab.shareRole}
                        disabled={pending}
                        onChange={(e) => handleRoleChange(collab.id, e.target.value as WhiteboardAccessRole)}
                        className="shrink-0 rounded-lg border border-border bg-surface py-1 pl-2 pr-6 text-xs text-foreground disabled:opacity-50"
                      >
                        {SHARE_ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {SHARE_ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleRemove(collab.id)}
                        title="Bỏ chia sẻ"
                        className="shrink-0 text-muted hover:text-danger disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted">Quyền truy cập chung</p>
              <div className="flex items-center gap-2">
                <select
                  value={info.generalAccessRole ?? "RESTRICTED"}
                  disabled={pending || loadingInfo}
                  onChange={(e) => handleGeneralAccessChange(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground disabled:opacity-50"
                >
                  <option value="RESTRICTED">Hạn chế — chỉ người được thêm ở trên</option>
                  {SHARE_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      Bất kỳ ai đã đăng nhập có đường liên kết — {SHARE_ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </div>
              {info.generalAccessRole && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-1.5 text-xs text-foreground transition-colors hover:bg-surface-hover"
                >
                  {linkCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                  {linkCopied ? "Đã sao chép" : "Sao chép đường liên kết"}
                </button>
              )}
              <p className="mt-2 text-[11px] text-muted">
                Áp dụng cho bất kỳ ai đã đăng nhập vào hệ thống (admin hoặc học viên) — không phải người ngoài chưa có
                tài khoản.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
