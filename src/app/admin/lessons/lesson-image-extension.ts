import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import type { MarkdownNodeSpec } from "tiptap-markdown";
import { insertAtomAndContinue } from "./insert-atom-and-continue";

export type LessonImageSize = "sm" | "md" | "lg";
export type LessonImageAlign = "left" | "center" | "right";

export function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;");
}

function classesFor(size: string, align: string) {
  return `lesson-img-${size} lesson-align-${align}`;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lessonImage: {
      setLessonImage: (options: {
        src: string;
        alt?: string;
        size?: LessonImageSize;
        align?: LessonImageAlign;
      }) => ReturnType;
    };
  }
}

// Named "lessonImage" (not "image") so tiptap-markdown's bundled default
// serializer for the "image" node name — which only knows plain
// ![alt](src) syntax — never shadows this node's own serializer below.
export const LessonImage = Image.extend({
  name: "lessonImage",

  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: "md",
        parseHTML: (element: HTMLElement) =>
          (element.getAttribute("class")?.match(/lesson-img-(sm|md|lg)/)?.[1] as LessonImageSize) ?? "md",
        renderHTML: () => ({}),
      },
      align: {
        default: "left",
        parseHTML: (element: HTMLElement) =>
          (element.getAttribute("class")?.match(/lesson-align-(left|center|right)/)?.[1] as LessonImageAlign) ??
          "left",
        renderHTML: () => ({}),
      },
    };
  },

  // Governs how the image looks inside the editor's own editing canvas —
  // uses the exact same lesson-img-*/lesson-align-* classes globals.css
  // already styles, so the WYSIWYG canvas visually matches the final
  // student-facing render (both share the same CSS rules).
  renderHTML({ node, HTMLAttributes }) {
    const size = (node.attrs.size as string) ?? "md";
    const align = (node.attrs.align as string) ?? "left";
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: classesFor(size, align),
      }),
    ];
  },

  addCommands() {
    return {
      setLessonImage: (options) => insertAtomAndContinue({ type: this.name, attrs: options }),
    };
  },

  // Explicit markdown serialization (rather than relying on tiptap-markdown's
  // generic raw-HTML node fallback, which mishandles void elements like
  // <img> by trying to set .innerHTML on them) — writes byte-identical
  // output to what the old textarea-based editor already produced, so
  // existing lessons and the render pipeline/sanitize schema in
  // lesson-markdown.tsx need zero changes.
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const src = (node.attrs.src as string) ?? "";
          const alt = (node.attrs.alt as string) ?? "";
          const size = (node.attrs.size as string) ?? "md";
          const align = (node.attrs.align as string) ?? "left";
          state.write(`<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="${classesFor(size, align)}" />`);
          state.closeBlock(node);
        },
        parse: {
          // Loading existing content is handled by markdown-it (html: true)
          // producing a real <img class="..."> element, then the parseHTML
          // rule (inherited from the base Image node) plus the size/align
          // attribute parseHTML above reconstruct the node normally.
        },
      } satisfies MarkdownNodeSpec,
    };
  },
});
