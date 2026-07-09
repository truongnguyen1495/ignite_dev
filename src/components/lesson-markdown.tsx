import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Element, Root } from "hast";

// The content editor lets admins insert a constrained set of raw HTML tags
// (image size/alignment classes, <u> for underline, YouTube <iframe>
// embeds) that plain Markdown has no syntax for. rehype-raw parses that raw
// HTML, and this schema is what keeps it safe to render — only these extra
// tag/attribute combinations are allowed on top of rehype-sanitize's
// default (GitHub-style) allowlist.
const lessonContentSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u", "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "alt", "className", "width", "height"],
    div: [...(defaultSchema.attributes?.div ?? []), "className"],
    // Text color has no Markdown syntax, so the editor emits inline
    // `style="color:..."` spans — safe to allow unrestricted here since this
    // content is only ever written by SUPER_ADMIN (requireActiveSuperAdmin()
    // gates every lesson/course/announcement action), same trust boundary
    // already extended to iframe's src below.
    span: [...(defaultSchema.attributes?.span ?? []), "style"],
    // GFM table column alignment (:---:/---:) parses to a `style` attribute
    // on th/td (via remark-gfm), same trust boundary as span above.
    th: [...(defaultSchema.attributes?.th ?? []), "style"],
    td: [...(defaultSchema.attributes?.td ?? []), "style"],
    iframe: ["src", "title", "allow", "allowFullScreen", "className", "frameBorder"],
  },
};

const YOUTUBE_EMBED_SRC_RE = /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/[a-zA-Z0-9_-]{11}(\?.*)?$/;

// rehype-sanitize's schema can allow-list the `src` *attribute name* on
// <iframe>, but not restrict *which URLs* it may point to — an editor bug
// or a directly-edited DB row could otherwise embed an arbitrary site.
// This walks the tree right after rehype-raw and strips any iframe whose
// src isn't a YouTube embed URL, closing that gap independently of the
// editor UI always constructing a safe src.
function restrictIframeSources() {
  return (tree: Root) => {
    function walk(node: Root | Element) {
      for (const child of node.children ?? []) {
        if (child.type === "element") {
          if (child.tagName === "iframe" && !YOUTUBE_EMBED_SRC_RE.test(String(child.properties?.src ?? ""))) {
            child.tagName = "div";
            child.properties = {};
          }
          walk(child);
        }
      }
    }
    walk(tree);
  };
}

export function LessonMarkdown({
  content,
  variant = "light",
}: {
  content: string;
  variant?: "light" | "dark";
}) {
  return (
    <div className={`lesson-content prose max-w-none ${variant === "dark" ? "prose-invert" : ""}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, restrictIframeSources, [rehypeSanitize, lessonContentSchema]]}
      >
        {content}
      </Markdown>
    </div>
  );
}
