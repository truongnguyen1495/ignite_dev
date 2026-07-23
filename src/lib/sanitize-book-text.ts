import "server-only";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { type Options } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

// The book editor's text element stores rich-text HTML from a constrained
// Tiptap instance (bold/italic/underline/lists/tables/color/footnotes — see
// rich-text-editor.tsx's config). MANAGE_LIBRARY is grantable to limited
// admins, not just Super Admin (same trust boundary as the button element's
// href allowlist in library-book-elements.ts), so this is the server-side
// backstop: a direct saveLibraryBookPagesAction call bypassing the client
// editor entirely could otherwise persist arbitrary HTML that gets rendered
// to every student/guest reading the book. Only this exact tag/attribute
// set survives; everything else is stripped. Same rehype-sanitize approach
// already used for lesson content in lesson-markdown.tsx.
//
// `style` on span is intentionally unrestricted (only the *attribute name*
// is allowlisted, not CSS values) — same call already made for lesson
// content's span in lesson-markdown.tsx: modern browsers don't execute CSS
// as script (no more expression()/javascript: url() in style values), so
// this doesn't reopen the XSS gap the rest of this schema exists to close.
const schema: Options = {
  tagNames: [
    "p",
    "strong",
    "em",
    "u",
    "ul",
    "ol",
    "li",
    "br",
    "table",
    "tbody",
    "tr",
    "td",
    "th",
    "span",
    "sup",
    "blockquote",
  ],
  attributes: {
    span: ["style"],
    sup: ["title", ["className", "footnote-ref"]],
  },
};

export function sanitizeBookText(html: string): string {
  const file = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .processSync(html);
  return String(file);
}
