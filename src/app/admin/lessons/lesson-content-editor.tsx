"use client";

import { useRef, useState } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Eye,
  Pencil,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { LessonMarkdown } from "@/components/lesson-markdown";

type Popover = { type: "link" | "image" } | null;

function getLineBounds(text: string, pos: number) {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  let lineEnd = text.indexOf("\n", pos);
  if (lineEnd === -1) lineEnd = text.length;
  return { lineStart, lineEnd };
}

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;");
}

const toolbarButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

export function LessonContentEditor({
  name = "content",
  id = "content",
  defaultValue = "",
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [fullscreen, setFullscreen] = useState(false);
  const [popover, setPopover] = useState<Popover>(null);
  const [linkFields, setLinkFields] = useState({ url: "", text: "" });
  const [imageFields, setImageFields] = useState({
    url: "",
    alt: "",
    size: "md" as "sm" | "md" | "lg",
    align: "left" as "left" | "center" | "right",
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function setSelectionAsync(start: number, end: number) {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  // Used by the link/image popovers, which can fire well after a prior
  // formatting action (e.g. Bold) has left its result selected for visual
  // feedback — inserting at selectionEnd rather than replacing [start, end]
  // means confirming a link/image never silently deletes that selection.
  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionEnd;
    const newValue = value.slice(0, pos) + text + value.slice(pos);
    setValue(newValue);
    const newPos = pos + text.length;
    setSelectionAsync(newPos, newPos);
  }

  function wrapSelection(before: string, after: string = before, placeholder = "") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(newValue);
    const selStart = start + before.length;
    const selEnd = selStart + selected.length;
    setSelectionAsync(selStart, selEnd);
  }

  function toggleHeading(level: 1 | 2 | 3) {
    const el = textareaRef.current;
    if (!el) return;
    const { lineStart, lineEnd } = getLineBounds(value, el.selectionStart);
    const line = value.slice(lineStart, lineEnd);
    const stripped = line.replace(/^#{1,6}\s+/, "");
    const prefix = "#".repeat(level) + " ";
    const newLine = line === prefix + stripped ? stripped : prefix + stripped;
    const newValue = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
    setValue(newValue);
    setSelectionAsync(lineStart + newLine.length, lineStart + newLine.length);
  }

  function applyToLines(mapLine: (line: string, index: number) => string) {
    const el = textareaRef.current;
    if (!el) return;
    const selStart = el.selectionStart;
    const selEnd = el.selectionEnd;
    const blockStart = value.lastIndexOf("\n", selStart - 1) + 1;
    let blockEnd = value.indexOf("\n", selEnd);
    if (blockEnd === -1) blockEnd = value.length;
    const block = value.slice(blockStart, blockEnd);
    const newBlock = block.split("\n").map(mapLine).join("\n");
    const newValue = value.slice(0, blockStart) + newBlock + value.slice(blockEnd);
    setValue(newValue);
    setSelectionAsync(blockStart, blockStart + newBlock.length);
  }

  function toggleBulletList() {
    applyToLines((line) =>
      line.trim() === "" ? line : line.startsWith("- ") ? line.slice(2) : `- ${line}`
    );
  }

  function toggleNumberedList() {
    let n = 0;
    applyToLines((line) => {
      if (line.trim() === "") return line;
      n += 1;
      return `${n}. ${line.replace(/^\d+\.\s+/, "")}`;
    });
  }

  function toggleQuote() {
    applyToLines((line) =>
      line.trim() === "" ? line : line.startsWith("> ") ? line.slice(2) : `> ${line}`
    );
  }

  function undo() {
    textareaRef.current?.focus();
    document.execCommand("undo");
  }

  function redo() {
    textareaRef.current?.focus();
    document.execCommand("redo");
  }

  function confirmLink() {
    if (!linkFields.url.trim()) return;
    const label = linkFields.text.trim() || linkFields.url.trim();
    insertAtCursor(`[${label}](${linkFields.url.trim()})`);
    setLinkFields({ url: "", text: "" });
    setPopover(null);
  }

  function confirmImage() {
    if (!imageFields.url.trim()) return;
    const classes = `lesson-img-${imageFields.size} lesson-align-${imageFields.align}`;
    insertAtCursor(
      `\n<img src="${escapeAttr(imageFields.url.trim())}" alt="${escapeAttr(imageFields.alt.trim())}" class="${classes}" />\n`
    );
    setImageFields({ url: "", alt: "", size: "md", align: "left" });
    setPopover(null);
  }

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4 sm:p-8"
          : ""
      }
    >
      {fullscreen && (
        <div className="mx-auto mb-4 flex w-full max-w-[1000px] items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Nội dung bài học</h2>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            <Minimize2 className="h-4 w-4" />
            Thu nhỏ
          </button>
        </div>
      )}
      <div className={fullscreen ? "mx-auto flex w-full max-w-[1000px] flex-1 flex-col" : ""}>
        <div className="rounded-lg border border-border bg-background">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
            <button type="button" title="Heading 1" onClick={() => toggleHeading(1)} className={toolbarButtonClass}>
              <Heading1 className="h-4 w-4" />
            </button>
            <button type="button" title="Heading 2" onClick={() => toggleHeading(2)} className={toolbarButtonClass}>
              <Heading2 className="h-4 w-4" />
            </button>
            <button type="button" title="Heading 3" onClick={() => toggleHeading(3)} className={toolbarButtonClass}>
              <Heading3 className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button
              type="button"
              title="In đậm"
              onClick={() => wrapSelection("**", "**", "chữ đậm")}
              className={toolbarButtonClass}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="In nghiêng"
              onClick={() => wrapSelection("_", "_", "chữ nghiêng")}
              className={toolbarButtonClass}
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Gạch chân"
              onClick={() => wrapSelection("<u>", "</u>", "chữ gạch chân")}
              className={toolbarButtonClass}
            >
              <Underline className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button type="button" title="Danh sách" onClick={toggleBulletList} className={toolbarButtonClass}>
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Danh sách đánh số"
              onClick={toggleNumberedList}
              className={toolbarButtonClass}
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button type="button" title="Trích dẫn" onClick={toggleQuote} className={toolbarButtonClass}>
              <Quote className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button
              type="button"
              title="Chèn link"
              onClick={() => setPopover(popover?.type === "link" ? null : { type: "link" })}
              className={toolbarButtonClass}
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Chèn ảnh"
              onClick={() => setPopover(popover?.type === "image" ? null : { type: "image" })}
              className={toolbarButtonClass}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
            <button type="button" title="Hoàn tác" onClick={undo} className={toolbarButtonClass}>
              <Undo2 className="h-4 w-4" />
            </button>
            <button type="button" title="Làm lại" onClick={redo} className={toolbarButtonClass}>
              <Redo2 className="h-4 w-4" />
            </button>

            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode(mode === "write" ? "preview" : "write")}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                {mode === "write" ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                {mode === "write" ? "Xem trước" : "Soạn thảo"}
              </button>
              <button
                type="button"
                title={fullscreen ? "Thu nhỏ" : "Mở rộng toàn màn hình"}
                onClick={() => setFullscreen(!fullscreen)}
                className={toolbarButtonClass}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </span>
          </div>

          {popover && (
            <div className="border-b border-border bg-surface-hover p-3">
              {popover.type === "link" ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted">URL</label>
                    <input
                      autoFocus
                      value={linkFields.url}
                      onChange={(e) => setLinkFields((f) => ({ ...f, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted">Chữ hiển thị</label>
                    <input
                      value={linkFields.text}
                      onChange={(e) => setLinkFields((f) => ({ ...f, text: e.target.value }))}
                      placeholder="(tùy chọn)"
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={confirmLink}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                  >
                    Chèn
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopover(null)}
                    className={toolbarButtonClass}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted">URL hình ảnh</label>
                    <input
                      autoFocus
                      value={imageFields.url}
                      onChange={(e) => setImageFields((f) => ({ ...f, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted">Mô tả ảnh (alt)</label>
                    <input
                      value={imageFields.alt}
                      onChange={(e) => setImageFields((f) => ({ ...f, alt: e.target.value }))}
                      placeholder="(tùy chọn)"
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Kích thước</label>
                    <select
                      value={imageFields.size}
                      onChange={(e) =>
                        setImageFields((f) => ({ ...f, size: e.target.value as typeof f.size }))
                      }
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="sm">Nhỏ</option>
                      <option value="md">Vừa</option>
                      <option value="lg">Lớn</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Căn ảnh</label>
                    <select
                      value={imageFields.align}
                      onChange={(e) =>
                        setImageFields((f) => ({ ...f, align: e.target.value as typeof f.align }))
                      }
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="left">Trái</option>
                      <option value="center">Giữa</option>
                      <option value="right">Phải</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={confirmImage}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                  >
                    Chèn
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopover(null)}
                    className={toolbarButtonClass}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            id={id}
            name={name}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            className={`w-full resize-y rounded-b-lg bg-background px-4 py-3 font-mono text-sm text-foreground focus:outline-none ${
              mode === "write" ? "block" : "hidden"
            } ${fullscreen ? "min-h-[70vh] flex-1" : "min-h-[420px]"}`}
          />
          <div
            className={`overflow-y-auto rounded-b-lg px-4 py-3 ${mode === "preview" ? "block" : "hidden"} ${
              fullscreen ? "min-h-[70vh] flex-1" : "min-h-[420px]"
            }`}
          >
            {value.trim() ? (
              <LessonMarkdown content={value} />
            ) : (
              <p className="text-sm text-muted">Chưa có nội dung để xem trước.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
