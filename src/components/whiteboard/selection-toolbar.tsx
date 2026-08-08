"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Trash2,
  MessageCircle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  Link2,
  Upload,
  Loader2,
  StickyNote,
  Square,
  Circle,
  Diamond,
  Triangle,
  Star,
} from "lucide-react";
import type { PositionedWhiteboardElement, ShapeKind, TextAlign, TextLink } from "@/lib/whiteboard-elements";
import { isTextElement, applyTextLink, findTextLinkCovering } from "@/lib/whiteboard-elements";
import { parseYoutubeId } from "@/lib/youtube";
import { uploadWhiteboardFile, domainOfUrl } from "@/lib/whiteboard-client-utils";
import { ColorPalettePicker } from "./color-palette-picker";

const iconBtnClass =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

function toggleBtnClass(active: boolean) {
  return active ? `${iconBtnClass} bg-primary-bg text-primary hover:bg-primary-bg hover:text-primary` : iconBtnClass;
}

const FONT_SIZE_PRESETS = [4, 8, 10, 12, 14, 18, 24, 32, 48, 64];

// Replaces the old −/number/+ stepper — same dropdown-under-a-toggle-button
// shape as ShapeKindPicker above. "Auto" (autoFontSize) sits above the
// preset list; picking a concrete size below it turns Auto back off, same
// "explicit choice always wins over the automatic one" convention as most
// editors' own font-size pickers.
function FontSizePicker({
  autoFontSize,
  fontSize,
  onChange,
}: {
  autoFontSize: boolean;
  fontSize: number;
  onChange: (patch: { autoFontSize: boolean; fontSize?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="Cỡ chữ"
        aria-label="Cỡ chữ"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
          open ? "bg-primary-bg text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        {autoFontSize ? "Auto" : fontSize}
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-1 max-h-64 w-16 -translate-x-1/2 space-y-0.5 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              onChange({ autoFontSize: true });
              setOpen(false);
            }}
            className={`block w-full rounded-lg py-1.5 text-center text-xs font-semibold ${
              autoFontSize ? "bg-primary-bg text-primary" : "text-foreground hover:bg-surface-hover"
            }`}
          >
            Auto
          </button>
          <div className="my-1 h-px bg-border" />
          {FONT_SIZE_PRESETS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onChange({ autoFontSize: false, fontSize: size });
                setOpen(false);
              }}
              className={`block w-full rounded-lg py-1.5 text-center text-xs ${
                !autoFontSize && fontSize === size ? "bg-primary-bg font-semibold text-primary" : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SHAPE_KIND_OPTIONS: { value: "sticky" | ShapeKind; label: string; icon: typeof StickyNote }[] = [
  { value: "sticky", label: "Ghi chú", icon: StickyNote },
  { value: "rectangle", label: "Chữ nhật", icon: Square },
  { value: "ellipse", label: "Hình tròn", icon: Circle },
  { value: "diamond", label: "Kim cương", icon: Diamond },
  { value: "triangle", label: "Tam giác", icon: Triangle },
  { value: "star", label: "Ngôi sao", icon: Star },
];

// Small popover (opened from the toolbar's leftmost icon) for converting a
// sticky/shape element to a different kind in place — backs the "change
// shape" control demoed against real Miro. Its own dropdown, not folded
// into the always-visible row, since 6 extra icons would crowd out
// everything else in the toolbar.
function ShapeKindPicker({ current, onPick }: { current: "sticky" | ShapeKind; onPick: (kind: "sticky" | ShapeKind) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = SHAPE_KIND_OPTIONS.find((o) => o.value === current)?.icon ?? StickyNote;

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="Đổi kiểu hình dạng"
        aria-label="Đổi kiểu hình dạng"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((o) => !o)}
        className={iconBtnClass}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-1 grid w-40 -translate-x-1/2 grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg"
        >
          {SHAPE_KIND_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => {
                onPick(value);
                setOpen(false);
              }}
              className={`flex h-9 items-center justify-center rounded-lg ${
                current === value ? "bg-primary-bg text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Popover with a plain URL input. Generalized over three uses: the
// standalone "text" element's whole-element hyperlink, a video element's
// YouTube link (raw pasted URL, parsed down to an 11-char id via `onApply`),
// and a linkCard's target URL — each passes its own `onApply` to interpret
// the trimmed input differently, so this component itself stays unaware of
// which field it's writing to.
function UrlPopoverButton({
  title,
  active,
  initialValue,
  placeholder,
  onApply,
}: {
  title: string;
  active: boolean;
  initialValue: string;
  placeholder: string;
  onApply: (raw: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const apply = () => {
    onApply(draft.trim());
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => {
          // Reset the draft to the current value right here (the moment
          // the popover opens), not in an effect keyed on `open` — setting
          // state synchronously inside an effect body trips React's "avoid
          // cascading renders" lint rule for a case that doesn't need an
          // effect at all, since this is a direct response to the click.
          setDraft(initialValue);
          setOpen((o) => !o);
        }}
        className={toggleBtnClass(active)}
      >
        <Link2 className="h-4 w-4" />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 space-y-2 rounded-xl border border-border bg-surface p-2 shadow-lg"
        >
          <input
            autoFocus
            type="text"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            className="w-full rounded-lg border border-border-strong bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex justify-end gap-1.5">
            {active && (
              <button
                type="button"
                onClick={() => {
                  onApply("");
                  setOpen(false);
                }}
                className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger-bg"
              >
                Xóa
              </button>
            )}
            <button type="button" onClick={apply} className="rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary-hover">
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Small icon-only upload trigger for image/video elements — same hidden
// native-input trick as PropertyPanel's UploadButton, just sized to sit
// inline in this toolbar's row instead of the wider property panel.
function UploadIconButton({
  accept,
  title,
  endpoint,
  onDone,
}: {
  accept: string;
  title: string;
  endpoint: string;
  onDone: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={uploading}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setUploading(true);
          const result = await uploadWhiteboardFile(endpoint, file);
          setUploading(false);
          if (result.url) onDone(result.url);
        }}
        className="hidden"
      />
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={uploading}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => inputRef.current?.click()}
        className={iconBtnClass}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </button>
    </>
  );
}

// Applies a link to whatever's currently selected inside the standalone
// Text element's inline edit <textarea> — unlike every other control in
// this toolbar, this one needs a live text selection (character offsets
// into `content`) to mean anything, so the button itself stays disabled
// until `editingSelection` (lifted up to whiteboard-canvas.tsx, which owns
// the textarea) reports a non-empty range. Re-opening the popover over an
// already-linked span prefills its URL and offers to remove it, via
// findTextLinkCovering.
//
// The range is snapshotted into `pendingRange` at the moment the button is
// clicked, rather than reading `editingSelection` live for the popover's
// whole lifetime: focusing this popover's own URL <input> necessarily
// blurs the textarea (only one element can hold focus), which stops
// editing and would otherwise reset the live `editingSelection` to null
// mid-interaction — the popover would vanish the instant the admin tried
// to click into the URL field. The snapshot keeps the popover working
// through that focus handoff.
function TextLinkButton({
  links,
  editingSelection,
  onApplyLink,
}: {
  links: TextLink[];
  editingSelection: { start: number; end: number } | null;
  onApplyLink: (start: number, end: number, url: string) => void;
}) {
  const [pendingRange, setPendingRange] = useState<{ start: number; end: number } | null>(null);
  const [draft, setDraft] = useState("");
  // Snapshotted alongside pendingRange for the same reason — it drives the
  // popover's "Xóa" button, and `covering` below (derived from the live
  // `editingSelection`) goes stale the instant the popover's own input
  // steals focus.
  const [wasExistingLink, setWasExistingLink] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pendingRange) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPendingRange(null);
    }
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [pendingRange]);

  const hasSelection = !!editingSelection && editingSelection.start < editingSelection.end;
  const covering = editingSelection ? findTextLinkCovering(links, editingSelection.start, editingSelection.end) : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={hasSelection ? "Chèn liên kết cho phần đã chọn" : "Bôi đen một đoạn chữ trước"}
        aria-label="Chèn liên kết"
        aria-pressed={!!covering}
        disabled={!hasSelection}
        // Deliberately NOT stopping propagation here (unlike this file's
        // other popover triggers) — it would skip the toolbar root's own
        // onMouseDown, which is what calls preventDefault() to keep the
        // text element's <textarea> focused. This button specifically
        // needs that: it reads `editingSelection` (derived from the
        // textarea's live selection) in onClick below, and a blur would
        // already have cleared it by the time onClick runs.
        onClick={() => {
          if (!editingSelection) return;
          setDraft(covering?.url ?? "");
          setWasExistingLink(!!covering);
          setPendingRange(editingSelection);
        }}
        className={hasSelection ? toggleBtnClass(!!covering) : `${iconBtnClass} opacity-30`}
      >
        <Link2 className="h-4 w-4" />
      </button>
      {pendingRange && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 space-y-2 rounded-xl border border-border bg-surface p-2 shadow-lg"
        >
          <input
            autoFocus
            type="text"
            value={draft}
            placeholder="https://..."
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onApplyLink(pendingRange.start, pendingRange.end, draft.trim());
                setPendingRange(null);
              }
            }}
            className="w-full rounded-lg border border-border-strong bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex justify-end gap-1.5">
            {wasExistingLink && (
              <button
                type="button"
                onClick={() => {
                  onApplyLink(pendingRange.start, pendingRange.end, "");
                  setPendingRange(null);
                }}
                className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger-bg"
              >
                Xóa
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onApplyLink(pendingRange.start, pendingRange.end, draft.trim());
                setPendingRange(null);
              }}
              className="rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary-hover"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Miro-style contextual mini-toolbar that floats just above the single
// selected element — quick access to the handful of properties an admin
// reaches for constantly (color, text formatting, shape kind, duplicate,
// delete) without opening the full PropertyPanel on the right. Rendered in
// SCREEN space (a sibling of the pan/zoom-transformed world div, see
// whiteboard-canvas.tsx), not inside it — like the zoom pill and connector
// layer, it must stay a fixed on-screen size and stay upright regardless of
// the element's own rotation, so it can't just be one more child positioned
// via the element's own (rotated, zoomed) box.
export function SelectionToolbar({
  element,
  screenX,
  screenY,
  onUpdateElement,
  onConvertKind,
  onDuplicate,
  onDelete,
  editingSelection,
  onComment,
}: {
  element: PositionedWhiteboardElement;
  screenX: number;
  screenY: number;
  onUpdateElement: (patch: Partial<PositionedWhiteboardElement>) => void;
  onConvertKind: (target: "sticky" | ShapeKind) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  // Character offsets of the current text selection inside the standalone
  // Text element's inline edit <textarea> (whiteboard-canvas.tsx owns the
  // ref) — only meaningful for element.type === "text", null otherwise/when
  // not editing. Backs TextLinkButton above.
  editingSelection: { start: number; end: number } | null;
  // Arms a new comment pin on this element (composer opens at its default
  // corner — see comment-pins.tsx) — always available regardless of
  // element type, matching the reference video showing it on both a text
  // note and a plain shape.
  onComment: () => void;
}) {
  return (
    <div
      className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
      style={{ left: screenX, top: screenY - 28 }}
      onMouseDown={(e) => {
        // Selecting a color/adjusting font size shouldn't also start a
        // canvas marquee-drag if the click lands just outside an actual
        // control.
        e.stopPropagation();
        // Also keep whatever's currently focused (in particular, a sticky's
        // inline edit <textarea> — this toolbar now stays mounted while
        // editing, not just while merely selected) focused through a button
        // click: the browser's default mousedown behavior shifts focus to
        // the clicked element, which would blur the textarea and fire its
        // onBlur={onStopEditing} before the click's own formatting change
        // even applies. Skipped for actual <input> targets (the URL/hex
        // color fields inside this toolbar's own popovers) so THEY can
        // still receive focus normally.
        if (!(e.target as HTMLElement).closest("input")) e.preventDefault();
      }}
    >
      {isTextElement(element) && (
        <>
          <ShapeKindPicker current={element.type === "sticky" ? "sticky" : element.kind} onPick={onConvertKind} />
          <div className="mx-0.5 h-5 w-px bg-border" />
          <ColorPalettePicker
            value={element.type === "sticky" ? element.bgColor : element.fill}
            onChange={(color) => onUpdateElement(element.type === "sticky" ? { bgColor: color } : { fill: color })}
            title="Màu nền"
          />
          {element.type === "shape" && (
            <ColorPalettePicker value={element.stroke} onChange={(stroke) => onUpdateElement({ stroke })} title="Màu viền" />
          )}
          <div className="mx-0.5 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => onUpdateElement({ bold: !element.bold })}
            title="In đậm"
            aria-label="In đậm"
            aria-pressed={element.bold}
            className={toggleBtnClass(element.bold)}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateElement({ underline: !element.underline })}
            title="Gạch chân"
            aria-label="Gạch chân"
            aria-pressed={element.underline}
            className={toggleBtnClass(element.underline)}
          >
            <Underline className="h-4 w-4" />
          </button>
          <div className="mx-0.5 h-5 w-px bg-border" />
          <FontSizePicker autoFontSize={element.autoFontSize} fontSize={element.fontSize} onChange={(patch) => onUpdateElement(patch)} />
          <div className="mx-0.5 h-5 w-px bg-border" />
        </>
      )}
      {element.type === "text" && (
        <>
          <ColorPalettePicker value={element.textColor} onChange={(textColor) => onUpdateElement({ textColor })} title="Màu chữ" />
          <ColorPalettePicker value={element.bgColor} onChange={(bgColor) => onUpdateElement({ bgColor })} title="Màu nền" />
          <div className="mx-0.5 h-5 w-px bg-border" />
          <button type="button" onClick={() => onUpdateElement({ bold: !element.bold })} title="In đậm" aria-label="In đậm" aria-pressed={element.bold} className={toggleBtnClass(element.bold)}>
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onUpdateElement({ italic: !element.italic })} title="In nghiêng" aria-label="In nghiêng" aria-pressed={element.italic} className={toggleBtnClass(element.italic)}>
            <Italic className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onUpdateElement({ underline: !element.underline })} title="Gạch chân" aria-label="Gạch chân" aria-pressed={element.underline} className={toggleBtnClass(element.underline)}>
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateElement({ strikethrough: !element.strikethrough })}
            title="Gạch ngang"
            aria-label="Gạch ngang"
            aria-pressed={element.strikethrough}
            className={toggleBtnClass(element.strikethrough)}
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <div className="mx-0.5 h-5 w-px bg-border" />
          {(
            [
              { value: "left", icon: AlignLeft, label: "Căn trái" },
              { value: "center", icon: AlignCenter, label: "Căn giữa" },
              { value: "right", icon: AlignRight, label: "Căn phải" },
              { value: "justify", icon: AlignJustify, label: "Căn đều hai bên" },
            ] as { value: TextAlign; icon: typeof AlignLeft; label: string }[]
          ).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onUpdateElement({ align: value })}
              title={label}
              aria-label={label}
              aria-pressed={element.align === value}
              className={toggleBtnClass(element.align === value)}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onUpdateElement({ bulletList: !element.bulletList })}
            title="Danh sách gạch đầu dòng"
            aria-label="Danh sách gạch đầu dòng"
            aria-pressed={element.bulletList}
            className={toggleBtnClass(element.bulletList)}
          >
            <List className="h-4 w-4" />
          </button>
          <TextLinkButton
            links={element.links}
            editingSelection={editingSelection}
            onApplyLink={(start, end, url) => onUpdateElement({ links: applyTextLink(element.links, start, end, url) })}
          />
          <div className="mx-0.5 h-5 w-px bg-border" />
          <FontSizePicker autoFontSize={element.autoFontSize} fontSize={element.fontSize} onChange={(patch) => onUpdateElement(patch)} />
          <div className="mx-0.5 h-5 w-px bg-border" />
        </>
      )}
      {element.type === "image" && (
        <>
          <UploadIconButton
            accept="image/png,image/jpeg,image/webp,image/gif"
            title="Tải ảnh lên"
            endpoint="/api/admin/upload-whiteboard-image"
            onDone={(url) => onUpdateElement({ url })}
          />
          <div className="mx-0.5 h-5 w-px bg-border" />
        </>
      )}
      {element.type === "video" && (
        <>
          <UploadIconButton
            accept="video/mp4"
            title="Tải video lên"
            endpoint="/api/admin/upload-whiteboard-video"
            onDone={(url) => onUpdateElement({ url })}
          />
          <UrlPopoverButton
            title="Link YouTube"
            active={!!element.youtubeId}
            initialValue={element.youtubeId}
            placeholder="https://youtube.com/watch?v=..."
            onApply={(raw) => onUpdateElement({ youtubeId: parseYoutubeId(raw) ?? "" })}
          />
          <div className="mx-0.5 h-5 w-px bg-border" />
        </>
      )}
      {element.type === "linkCard" && (
        <>
          <UrlPopoverButton
            title="Đặt URL"
            active={!!element.url}
            initialValue={element.url}
            placeholder="https://..."
            onApply={(raw) => onUpdateElement({ url: raw, domain: domainOfUrl(raw) })}
          />
          <div className="mx-0.5 h-5 w-px bg-border" />
        </>
      )}
      <button type="button" onClick={onComment} title="Bình luận" aria-label="Bình luận" className={iconBtnClass}>
        <MessageCircle className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <button type="button" onClick={onDuplicate} title="Nhân bản (Ctrl+D)" aria-label="Nhân bản" className={iconBtnClass}>
        <Copy className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDelete} title="Xóa (Delete)" aria-label="Xóa" className={`${iconBtnClass} hover:bg-danger-bg hover:text-danger`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
