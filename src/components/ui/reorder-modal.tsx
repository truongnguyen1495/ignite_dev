"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReorderItem = { id: string; label: string; sublabel?: string };

function SortableRow({ item }: { item: ReorderItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Kéo để sắp xếp"
        className="shrink-0 cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{item.label}</p>
        {item.sublabel && <p className="truncate text-xs text-muted">{item.sublabel}</p>}
      </div>
    </li>
  );
}

// Generic drag-and-drop reorder dialog, shared by admin/courses,
// admin/library, and admin/lessons (one instance per level group there,
// since lessons only need reordering within their own level). Replaces the
// old free-text "Thứ tự hiển thị" number input — admins drag rows instead
// of typing/guessing numbers, and onSave persists the full resulting order
// in one call (see reorderCoursesAction et al., each doing a single
// $transaction of index-based updates).
export function ReorderModal({
  triggerLabel,
  triggerClassName,
  title,
  items,
  onSave,
}: {
  triggerLabel: ReactNode;
  triggerClassName?: string;
  title: string;
  items: ReorderItem[];
  onSave: (orderedIds: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<ReorderItem[]>(items);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleOpen(e: React.MouseEvent) {
    // Guards against a trigger nested inside another clickable ancestor
    // (e.g. CollapsibleSection's own toggle button) — same reasoning as
    // BuyButton/ProductBuyButton's Link-nesting guard.
    e.preventDefault();
    e.stopPropagation();
    setOrder(items);
    setOpen(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave(order.map((i) => i.id));
    setSaving(false);
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!saving) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !saving && setOpen(false)}
              aria-label="Đóng"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="pr-8 text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-xs text-muted">Kéo-thả để sắp xếp lại thứ tự hiển thị.</p>

            <div className="mt-4 flex-1 overflow-y-auto">
              {order.length === 0 ? (
                <p className="text-sm text-muted">Chưa có mục nào.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={order.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {order.map((item) => (
                        <SortableRow key={item.id} item={item} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="button" variant="primary" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Lưu thứ tự
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
