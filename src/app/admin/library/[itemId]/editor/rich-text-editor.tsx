"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Table as TableIcon,
  Columns3,
  Rows3,
  Trash2,
  Maximize2,
  Minimize2,
  Palette,
  StickyNote,
} from "lucide-react";
import { FootnoteRef } from "./footnote-extension";

// Same button styling convention as lesson-content-editor.tsx's toolbar.
const toolbarButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";
const activeToolbarButtonClass = "flex h-7 w-7 items-center justify-center rounded-md bg-surface-hover text-foreground";

// Same swatch set as lesson-content-editor.tsx's TEXT_COLORS, for the same
// look across both editors.
const TEXT_COLORS: { label: string; value: string }[] = [
  { label: "Đỏ", value: "#ef4444" },
  { label: "Cam", value: "#f97316" },
  { label: "Vàng", value: "#eab308" },
  { label: "Lục", value: "#16a34a" },
  { label: "Lam", value: "#2563eb" },
  { label: "Chàm", value: "#4338ca" },
  { label: "Tím", value: "#9333ea" },
  { label: "Hồng", value: "#db2777" },
];

// Deliberately minimal — a book page's text box, not a full lesson editor.
// Bold/italic/underline/lists/tables/color/footnotes are exposed here
// (matching sanitizeBookText's allowlist exactly; anything this editor
// can't produce doesn't need a slot in that allowlist). No headings/links/
// images — this element already sits inside the editor's own font-size/
// align controls, and images/links are their own separate element types.
export function RichTextEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  // Whether the cursor is currently inside a table — drives the extra
  // row/column strip below. editor.isActive() itself isn't reactive (it
  // only reflects the editor's state at the instant it's called), so this
  // needs its own state kept in sync via onTransaction, which fires on
  // every selection move as well as every edit.
  const [inTable, setInTable] = useState(false);
  // The property panel is a narrow w-72 sidebar — fine for a short label,
  // cramped for a real paragraph. This renders the SAME editor instance
  // (not a second one — Tiptap/ProseMirror only ever mounts its view in
  // whichever <EditorContent> is currently in the tree, so toggling which
  // one renders doesn't lose or fork any content) inside a full-screen
  // portal overlay instead, escaping the sidebar's width entirely.
  const [expanded, setExpanded] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    onTransaction: ({ editor }) => setInTable(editor.isActive("table")),
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        link: false,
        strike: false,
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      FootnoteRef,
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-2 py-1.5 min-h-[80px]",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  function btnClass(active: boolean) {
    return active ? activeToolbarButtonClass : toolbarButtonClass;
  }

  const toolbar = (
    <>
      <div className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive("bold"))}
          title="In đậm"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive("italic"))}
          title="In nghiêng"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive("underline"))}
          title="Gạch chân"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive("bulletList"))}
          title="Danh sách gạch đầu dòng"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive("orderedList"))}
          title="Danh sách đánh số"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={btnClass(inTable)}
          title="Chèn bảng 3x3"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setColorPopoverOpen((v) => !v)}
            className={btnClass(colorPopoverOpen)}
            title="Màu chữ"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
          {colorPopoverOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 flex w-48 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-2 shadow-md">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => {
                    editor.chain().focus().setColor(c.value).run();
                    setColorPopoverOpen(false);
                  }}
                  style={{ backgroundColor: c.value }}
                  className={`h-6 w-6 rounded-full border-2 ${
                    editor.isActive("textStyle", { color: c.value }) ? "border-foreground" : "border-border"
                  }`}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setColorPopoverOpen(false);
                }}
                className="w-full rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-hover"
              >
                Mặc định
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const note = window.prompt("Nội dung chú thích:");
            if (note) editor.chain().focus().insertContent({ type: "footnoteRef", attrs: { note } }).run();
          }}
          className={toolbarButtonClass}
          title="Thêm chú thích"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={toolbarButtonClass}
          title={expanded ? "Thu nhỏ" : "Phóng to để soạn"}
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {inTable && (
        <div className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className={toolbarButtonClass}
            title="Thêm cột"
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span className="sr-only">Thêm cột</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className={toolbarButtonClass}
            title="Xóa cột"
          >
            <Columns3 className="h-3.5 w-3.5" />
            <Trash2 className="-ml-1 h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className={toolbarButtonClass}
            title="Thêm dòng"
          >
            <Rows3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className={toolbarButtonClass}
            title="Xóa dòng"
          >
            <Rows3 className="h-3.5 w-3.5" />
            <Trash2 className="-ml-1 h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className={toolbarButtonClass}
            title="Xóa cả bảng"
          >
            <TableIcon className="h-3.5 w-3.5" />
            <Trash2 className="-ml-1 h-2.5 w-2.5 text-danger" />
          </button>
        </div>
      )}
    </>
  );

  if (expanded) {
    return createPortal(
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-6">
        <div className="flex max-h-full w-full max-w-3xl flex-col gap-1.5 rounded-xl bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">Soạn nội dung</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
            >
              Xong
            </button>
          </div>
          {toolbar}
          <EditorContent
            editor={editor}
            className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-background text-sm"
          />
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="space-y-1.5">
      {toolbar}
      <EditorContent editor={editor} className="rounded-lg border border-border bg-background text-sm" />
    </div>
  );
}
