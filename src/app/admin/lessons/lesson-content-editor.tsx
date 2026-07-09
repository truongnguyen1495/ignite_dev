"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
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
  SquarePlay,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { LessonImage, type LessonImageAlign, type LessonImageSize } from "./lesson-image-extension";
import { LessonYoutube } from "./lesson-youtube-extension";
import { LinkHoverMenu } from "./link-hover-menu";
import { parseYoutubeId } from "@/lib/youtube";

type Popover = { type: "link" | "image" | "youtube" } | null;

const toolbarButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";
const activeToolbarButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-md bg-surface-hover text-foreground";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const bubbleButtonClass = "rounded px-2 py-1 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground";
const activeBubbleButtonClass = "rounded px-2 py-1 text-xs font-medium bg-primary text-primary-foreground";

export function LessonContentEditor({
  name = "content",
  id = "content",
  defaultValue = "",
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [popover, setPopover] = useState<Popover>(null);
  const [linkFields, setLinkFields] = useState({ url: "", text: "" });
  const [linkHasSelection, setLinkHasSelection] = useState(false);
  const [imageFields, setImageFields] = useState({
    url: "",
    alt: "",
    size: "md" as LessonImageSize,
    align: "left" as LessonImageAlign,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState(defaultValue);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: true,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
        },
      }),
      LessonImage,
      LessonYoutube,
      Markdown.configure({ html: true, bulletListMarker: "-", linkify: false }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "lesson-content prose max-w-none focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      const markdownStorage = editor.storage as unknown as { markdown: { getMarkdown(): string } };
      setMarkdown(markdownStorage.markdown.getMarkdown());
    },
  });

  function btnClass(active: boolean) {
    return active ? activeToolbarButtonClass : toolbarButtonClass;
  }

  function openLinkPopover() {
    if (!editor) return;
    if (popover?.type === "link") {
      setPopover(null);
      return;
    }
    setLinkHasSelection(!editor.state.selection.empty);
    setLinkFields({ url: "", text: "" });
    setPopover({ type: "link" });
  }

  function openImagePopover() {
    setUploadError(null);
    setPopover(popover?.type === "image" ? null : { type: "image" });
  }

  function openYoutubePopover() {
    setYoutubeError(null);
    setYoutubeUrl("");
    setPopover(popover?.type === "youtube" ? null : { type: "youtube" });
  }

  function confirmLink() {
    if (!editor || !linkFields.url.trim()) return;
    const url = linkFields.url.trim();
    if (linkHasSelection) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      const label = linkFields.text.trim() || url;
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: { href: url } }] })
        .run();
    }
    setLinkFields({ url: "", text: "" });
    setPopover(null);
  }

  function confirmImage() {
    if (!editor || !imageFields.url.trim()) return;
    editor
      .chain()
      .focus()
      .setLessonImage({
        src: imageFields.url.trim(),
        alt: imageFields.alt.trim(),
        size: imageFields.size,
        align: imageFields.align,
      })
      .run();
    setImageFields({ url: "", alt: "", size: "md", align: "left" });
    setPopover(null);
  }

  function confirmYoutube() {
    if (!editor || !youtubeUrl.trim()) return;
    const videoId = parseYoutubeId(youtubeUrl.trim());
    if (!videoId) {
      setYoutubeError("Không nhận ra link YouTube này. Kiểm tra lại đường dẫn.");
      return;
    }
    editor.chain().focus().setLessonYoutube({ videoId }).run();
    setYoutubeUrl("");
    setYoutubeError(null);
    setPopover(null);
  }

  // Popover inputs sit inside the lesson form; without this, Enter would
  // bubble up and submit that outer form instead of confirming the popover.
  function handleLinkKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    confirmLink();
  }

  function handleImageKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    confirmImage();
  }

  function handleYoutubeKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    confirmYoutube();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setUploadError("Chỉ hỗ trợ ảnh PNG, JPEG, WEBP hoặc GIF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Ảnh vượt quá giới hạn 5MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải ảnh lên thất bại.");
      }
      setImageFields((f) => ({ ...f, url: data.url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
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
          <div className="sticky top-0 z-10 rounded-t-lg bg-background">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
              <button
                type="button"
                title="Heading 1"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className={btnClass(!!editor?.isActive("heading", { level: 1 }))}
              >
                <Heading1 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Heading 2"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={btnClass(!!editor?.isActive("heading", { level: 2 }))}
              >
                <Heading2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Heading 3"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                className={btnClass(!!editor?.isActive("heading", { level: 3 }))}
              >
                <Heading3 className="h-4 w-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              <button
                type="button"
                title="In đậm"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={btnClass(!!editor?.isActive("bold"))}
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="In nghiêng"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={btnClass(!!editor?.isActive("italic"))}
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Gạch chân"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={btnClass(!!editor?.isActive("underline"))}
              >
                <Underline className="h-4 w-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              <button
                type="button"
                title="Danh sách"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={btnClass(!!editor?.isActive("bulletList"))}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Danh sách đánh số"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={btnClass(!!editor?.isActive("orderedList"))}
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Trích dẫn"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                className={btnClass(!!editor?.isActive("blockquote"))}
              >
                <Quote className="h-4 w-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              <button
                type="button"
                title="Chèn link"
                onClick={openLinkPopover}
                className={btnClass(popover?.type === "link")}
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Chèn ảnh"
                onClick={openImagePopover}
                className={btnClass(popover?.type === "image")}
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Chèn video YouTube"
                onClick={openYoutubePopover}
                className={btnClass(popover?.type === "youtube")}
              >
                <SquarePlay className="h-4 w-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              <button
                type="button"
                title="Hoàn tác"
                onClick={() => editor?.chain().focus().undo().run()}
                className={toolbarButtonClass}
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Làm lại"
                onClick={() => editor?.chain().focus().redo().run()}
                className={toolbarButtonClass}
              >
                <Redo2 className="h-4 w-4" />
              </button>

              <span className="ml-auto flex items-center gap-1">
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
                        onKeyDown={handleLinkKeyDown}
                        placeholder="https://..."
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    {!linkHasSelection && (
                      <div className="min-w-[140px] flex-1">
                        <label className="mb-1 block text-xs font-medium text-muted">Chữ hiển thị</label>
                        <input
                          value={linkFields.text}
                          onChange={(e) => setLinkFields((f) => ({ ...f, text: e.target.value }))}
                          onKeyDown={handleLinkKeyDown}
                          placeholder="(tùy chọn)"
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={confirmLink}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                    >
                      Chèn
                    </button>
                    <button type="button" onClick={() => setPopover(null)} className={toolbarButtonClass}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : popover.type === "image" ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[200px] flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted">URL hình ảnh</label>
                      <input
                        autoFocus
                        value={imageFields.url}
                        onChange={(e) => setImageFields((f) => ({ ...f, url: e.target.value }))}
                        onKeyDown={handleImageKeyDown}
                        placeholder="https://... hoặc tải ảnh lên từ máy"
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileSelected}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Đang tải..." : "Tải ảnh lên"}
                    </button>
                    <div className="min-w-[140px] flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted">Mô tả ảnh (alt)</label>
                      <input
                        value={imageFields.alt}
                        onChange={(e) => setImageFields((f) => ({ ...f, alt: e.target.value }))}
                        onKeyDown={handleImageKeyDown}
                        placeholder="(tùy chọn)"
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">Kích thước</label>
                      <select
                        value={imageFields.size}
                        onChange={(e) =>
                          setImageFields((f) => ({ ...f, size: e.target.value as LessonImageSize }))
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
                          setImageFields((f) => ({ ...f, align: e.target.value as LessonImageAlign }))
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
                    <button type="button" onClick={() => setPopover(null)} className={toolbarButtonClass}>
                      <X className="h-4 w-4" />
                    </button>
                    {uploadError && <p className="w-full text-xs text-red-600">{uploadError}</p>}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[240px] flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted">Link video YouTube</label>
                      <input
                        autoFocus
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        onKeyDown={handleYoutubeKeyDown}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={confirmYoutube}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                    >
                      Chèn
                    </button>
                    <button type="button" onClick={() => setPopover(null)} className={toolbarButtonClass}>
                      <X className="h-4 w-4" />
                    </button>
                    {youtubeError && <p className="w-full text-xs text-red-600">{youtubeError}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {editor && (
            <BubbleMenu editor={editor} shouldShow={({ editor }) => editor.isActive("lessonImage")}>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 shadow-lg">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => editor.chain().focus().updateAttributes("lessonImage", { size }).run()}
                    className={
                      editor.getAttributes("lessonImage").size === size
                        ? activeBubbleButtonClass
                        : bubbleButtonClass
                    }
                  >
                    {size === "sm" ? "Nhỏ" : size === "md" ? "Vừa" : "Lớn"}
                  </button>
                ))}
                <span className="mx-1 h-5 w-px bg-border" />
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => editor.chain().focus().updateAttributes("lessonImage", { align }).run()}
                    className={
                      editor.getAttributes("lessonImage").align === align
                        ? activeBubbleButtonClass
                        : bubbleButtonClass
                    }
                  >
                    {align === "left" ? "Trái" : align === "center" ? "Giữa" : "Phải"}
                  </button>
                ))}
              </div>
            </BubbleMenu>
          )}

          <div
            className={`relative overflow-y-auto rounded-b-lg ${fullscreen ? "min-h-[70vh] flex-1" : "min-h-[420px]"}`}
          >
            {editor ? (
              <>
                <EditorContent editor={editor} />
                <LinkHoverMenu editor={editor} />
              </>
            ) : (
              <p className="px-4 py-3 text-sm text-muted">Đang tải trình soạn thảo...</p>
            )}
          </div>
        </div>
      </div>
      <input type="hidden" name={name} id={id} value={markdown} />
    </div>
  );
}
