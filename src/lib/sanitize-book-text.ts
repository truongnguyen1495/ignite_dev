import "server-only";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

// The book editor's text element stores rich-text HTML from a constrained
// Tiptap instance (bold/italic/underline/lists only — see
// property-panel.tsx's text editor config). MANAGE_LIBRARY is grantable to
// limited admins, not just Super Admin (same trust boundary as the button
// element's href allowlist in library-book-elements.ts), so this is the
// server-side backstop: a direct saveLibraryBookPagesAction call bypassing
// the client editor entirely could otherwise persist arbitrary HTML that
// gets rendered to every student/guest reading the book. Only this exact
// tag set survives; everything else (including all attributes, so no
// onerror=/style=/href= smuggling) is stripped. Same rehype-sanitize
// approach already used for lesson content in lesson-markdown.tsx, just a
// much narrower allowlist since this editor has no images/links/tables yet.
const schema = {
  tagNames: ["p", "strong", "em", "u", "ul", "ol", "li", "br", "table", "tbody", "tr", "td", "th"],
  attributes: {},
};

export function sanitizeBookText(html: string): string {
  const file = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .processSync(html);
  return String(file);
}
