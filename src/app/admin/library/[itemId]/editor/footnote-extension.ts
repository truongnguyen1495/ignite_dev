import { Node, mergeAttributes } from "@tiptap/core";

// A small inline marker (like a book's footnote reference) — the number
// shown is NOT stored anywhere; it's assigned purely by CSS counters (see
// .book-text/.ProseMirror .footnote-ref in globals.css), counting these
// nodes left-to-right in document order. That sidesteps having to keep an
// explicit index in sync as footnotes get added, removed, or reordered.
// The note text itself rides along as a plain `title` attribute, so it
// shows as a native hover tooltip with zero extra interactive JS needed —
// works the same way in the editor's live view and the actual reader.
export const FootnoteRef = Node.create({
  name: "footnoteRef",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      note: {
        default: "",
        parseHTML: (element) => element.getAttribute("title") ?? "",
        renderHTML: (attributes) => ({ title: attributes.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "sup.footnote-ref" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes, { class: "footnote-ref" })];
  },
});
