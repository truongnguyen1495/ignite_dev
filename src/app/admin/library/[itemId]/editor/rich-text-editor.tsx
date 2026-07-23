"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Table as TableIcon } from "lucide-react";

// Same button styling convention as lesson-content-editor.tsx's toolbar.
const toolbarButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";
const activeToolbarButtonClass = "flex h-7 w-7 items-center justify-center rounded-md bg-surface-hover text-foreground";

// Deliberately minimal — a book page's text box, not a full lesson editor.
// Only bold/italic/underline/lists/tables are exposed here (matching
// sanitizeBookText's allowlist exactly; anything this editor can't produce
// doesn't need a slot in that allowlist). No headings/links/images/color —
// this element already sits inside the editor's own font-size/color/align
// controls, and images/links are their own separate element types.
export function RichTextEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
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

  return (
    <div className="space-y-1.5">
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
          className={btnClass(editor.isActive("table"))}
          title="Chèn bảng 3x3"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} className="rounded-lg border border-border bg-background text-sm" />
    </div>
  );
}
