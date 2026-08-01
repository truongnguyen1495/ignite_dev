"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Pencil, Loader2, Workflow, Users } from "lucide-react";
import { formatDateTimeVN } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createWhiteboardAction, renameWhiteboardAction, deleteWhiteboardAction } from "./actions";

export type WhiteboardListItem = {
  id: string;
  title: string;
  updatedAt: string;
  createdByName: string | null;
  lastEditedByName: string | null;
  collaboratorCount: number;
};

// Inline "+ Bảng vẽ mới" form — a board has no field beyond a title, so a
// dedicated /new page (the book library's flow) would just be an extra hop
// for nothing; this expands in place instead.
function NewBoardForm({ onCancel }: { onCancel: () => void }) {
  const [error, formAction, pending] = useActionState(createWhiteboardAction, undefined);
  return (
    <form action={formAction} className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3">
      <Input id="new-board-title" name="title" placeholder="Tên bảng vẽ..." autoFocus className="flex-1" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Tạo
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
        Hủy
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}

function RenameBoardButton({ boardId, title }: { boardId: string; title: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onClick={(e) => e.preventDefault()}
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await renameWhiteboardAction(boardId, value);
            setEditing(false);
            router.refresh();
          });
        }}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="h-7 w-32 rounded border border-border bg-surface px-1.5 text-xs text-foreground"
        />
        <Button type="submit" size="icon" variant="ghost" disabled={pending} title="Lưu">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "✓"}
        </Button>
      </form>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Đổi tên"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  );
}

function DeleteBoardButton({ boardId, title }: { boardId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Xóa"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirm({ title: `Xóa bảng vẽ "${title}"?`, confirmLabel: "Xóa", tone: "danger" });
        if (!ok) return;
        startTransition(async () => {
          await deleteWhiteboardAction(boardId);
          router.refresh();
        });
      }}
      className="hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

export function WhiteboardList({ items }: { items: WhiteboardListItem[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {creating ? (
        <NewBoardForm onCancel={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Bảng vẽ mới
        </button>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted">Chưa có bảng vẽ nào — bấm &quot;Bảng vẽ mới&quot; để bắt đầu.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <Link
                href={`/admin/whiteboards/${item.id}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-dark-border bg-dark-surface p-5 transition-colors hover:border-primary/60"
              >
                <div className="flex items-center justify-between pr-14">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Workflow className="h-5 w-5" />
                  </div>
                  {item.collaboratorCount > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <Users className="h-3 w-3" />
                      {item.collaboratorCount}
                    </span>
                  )}
                </div>
                <p className="pr-14 font-semibold text-dark-foreground">{item.title}</p>
                <p className="text-xs text-dark-muted">Cập nhật lúc {formatDateTimeVN(new Date(item.updatedAt))}</p>
                {item.lastEditedByName && (
                  <p className="text-xs text-dark-muted">Sửa lần cuối: {item.lastEditedByName}</p>
                )}
              </Link>
              <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg bg-surface/90 p-0.5 shadow-sm">
                <RenameBoardButton boardId={item.id} title={item.title} />
                <DeleteBoardButton boardId={item.id} title={item.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
