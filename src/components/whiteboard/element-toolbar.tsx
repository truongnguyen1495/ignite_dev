import { StickyNote, Image as ImageIcon, Square, Video, Link2, Type, Undo2, Redo2, HelpCircle, MousePointer2, Hand, Spline, Pencil, Eraser } from "lucide-react";
import type { PlaceableType } from "@/lib/whiteboard-elements";
import { ColorPalettePicker } from "./color-palette-picker";

// "connector" = the arrow tool (A) — click-drag from one element's body to
// another to draw a connector between them, an alternative to dragging from
// a selected element's own anchor dots. See whiteboard-canvas.tsx's Rnd
// onMouseDown for where this actually intercepts the click.
// "pen" = freehand drawing (P) — click-drag anywhere (including over other
// elements) to lay down a stroke, which becomes its own "drawing" element
// (see addDrawing in whiteboard-editor.tsx) — a real object like everything
// else on the board, not a separate pixel layer, so it gets undo/redo,
// drag/resize/rotate, and PNG/JSON export for free.
// "eraser" = stroke eraser (E) — click/drag over an existing drawing to
// delete it whole; never touches any other element type.
export type WhiteboardTool = "select" | "hand" | "connector" | "pen" | "eraser";

const TOOLS: { type: PlaceableType; label: string; icon: typeof StickyNote }[] = [
  { type: "sticky", label: "Ghi chú", icon: StickyNote },
  { type: "shape", label: "Hình khối", icon: Square },
  { type: "text", label: "Chữ", icon: Type },
  { type: "image", label: "Ảnh", icon: ImageIcon },
  { type: "video", label: "Video", icon: Video },
  { type: "linkCard", label: "Link", icon: Link2 },
];

const iconBtnClass =
  "flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";

function toolButtonClass(active: boolean) {
  return active ? `${iconBtnClass} bg-primary-bg text-primary hover:bg-primary-bg hover:text-primary` : iconBtnClass;
}

const MIN_PEN_SIZE = 1;
const MAX_PEN_SIZE = 40;

// Flyout for the pen tool's own color + brush size — only ever rendered
// while the pen tool is active (see the "pen" case below), matching this
// app's "less permanent UI, more on-demand controls" convention rather than
// a control row that's always taking up space in the main pill.
function PenSettingsPopover({
  color,
  onColorChange,
  size,
  onSizeChange,
}: {
  color: string;
  onColorChange: (color: string) => void;
  size: number;
  onSizeChange: (size: number) => void;
}) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg"
    >
      <ColorPalettePicker value={color} onChange={onColorChange} title="Màu nét vẽ" />
      <div className="h-5 w-px bg-border" />
      <input
        type="range"
        min={MIN_PEN_SIZE}
        max={MAX_PEN_SIZE}
        value={size}
        onChange={(e) => onSizeChange(Number(e.target.value))}
        title="Cỡ nét"
        aria-label="Cỡ nét"
        className="w-24 accent-primary"
      />
      <span className="w-7 shrink-0 text-center text-xs text-muted">{size}px</span>
    </div>
  );
}

// Floating vertical icon rail (Miro-style: a single rounded pill holding
// every tool/action in one straight column — modes, placeable types,
// undo/redo, and help all in the same rail rather than undo/redo sitting
// in their own detached pill below it) — whiteboard-editor.tsx positions
// this `absolute` over the canvas. Click a tool to ARM it (the button lights
// up, a ghost preview follows the cursor), then click anywhere on the canvas
// to actually drop a new element of that type there — same two-step
// "select a tool, then act on the canvas" flow the connector/pen tools
// already use, rather than dropping the element immediately at the
// viewport center. Mirrors src/app/admin/library/[itemId]/editor/element-toolbar.tsx
// in spirit, not in layout.
export function ElementToolbar({
  onAdd,
  placingType,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  activeTool,
  onToolChange,
  penColor,
  onPenColorChange,
  penSize,
  onPenSizeChange,
}: {
  // Arms click-to-place for that type — clicking the same button again
  // (see placingType below) disarms it, so this doesn't drop an element
  // immediately; whiteboard-canvas.tsx's placingType handling does that on
  // the next canvas click.
  onAdd: (type: PlaceableType) => void;
  // Which placeable type (if any) is currently armed — highlights that one
  // button the same way activeTool highlights select/hand/connector.
  placingType: PlaceableType | null;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  activeTool: WhiteboardTool;
  onToolChange: (tool: WhiteboardTool) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  penSize: number;
  onPenSizeChange: (size: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
      <button
        type="button"
        onClick={() => onToolChange("select")}
        title="Công cụ chọn"
        aria-label="Công cụ chọn"
        aria-pressed={activeTool === "select"}
        className={toolButtonClass(activeTool === "select")}
      >
        <MousePointer2 className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onToolChange(activeTool === "hand" ? "select" : "hand")}
        title="Tay kéo (giữ Space hoặc nhấn H) — kéo để di chuyển cả bảng vẽ"
        aria-label="Tay kéo"
        aria-pressed={activeTool === "hand"}
        className={toolButtonClass(activeTool === "hand")}
      >
        <Hand className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onToolChange(activeTool === "connector" ? "select" : "connector")}
        title="Công cụ nối (A) — kéo từ một đối tượng sang đối tượng khác để vẽ đường nối"
        aria-label="Công cụ nối"
        aria-pressed={activeTool === "connector"}
        className={toolButtonClass(activeTool === "connector")}
      >
        <Spline className="h-5 w-5" />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => onToolChange(activeTool === "pen" ? "select" : "pen")}
          title="Bút vẽ (P) — vẽ nét tay tự do"
          aria-label="Bút vẽ"
          aria-pressed={activeTool === "pen"}
          className={toolButtonClass(activeTool === "pen")}
        >
          <Pencil className="h-5 w-5" />
        </button>
        {activeTool === "pen" && (
          <div className="absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2">
            <PenSettingsPopover color={penColor} onColorChange={onPenColorChange} size={penSize} onSizeChange={onPenSizeChange} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onToolChange(activeTool === "eraser" ? "select" : "eraser")}
        title="Tẩy nét vẽ (E) — chạm/kéo qua một nét vẽ để xóa cả nét đó"
        aria-label="Tẩy nét vẽ"
        aria-pressed={activeTool === "eraser"}
        className={toolButtonClass(activeTool === "eraser")}
      >
        <Eraser className="h-5 w-5" />
      </button>
      {TOOLS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          title={label}
          aria-label={label}
          aria-pressed={placingType === type}
          className={toolButtonClass(placingType === type)}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
      <div className="my-1 h-px w-8 bg-border" />
      <button type="button" onClick={onUndo} disabled={!canUndo} title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" className={iconBtnClass}>
        <Undo2 className="h-5 w-5" />
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo} title="Làm lại (Ctrl+Shift+Z)" aria-label="Làm lại" className={iconBtnClass}>
        <Redo2 className="h-5 w-5" />
      </button>
      <div className="my-1 h-px w-8 bg-border" />
      <button
        type="button"
        title="Kéo từ chấm neo quanh phần tử đã chọn để nối mũi tên. Tab: thêm nhánh con. Enter: thêm nhánh ngang hàng."
        aria-label="Trợ giúp"
        className={iconBtnClass}
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
