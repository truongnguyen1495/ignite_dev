import { Node, mergeAttributes } from "@tiptap/core";
import type { MarkdownNodeSpec } from "tiptap-markdown";
import { insertAtomAndContinue } from "./insert-atom-and-continue";

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const WRAPPER_CLASS = "lesson-youtube aspect-video w-full overflow-hidden rounded-lg border border-border";
const IFRAME_CLASS = "h-full w-full";
const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

function embedSrc(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lessonYoutube: {
      setLessonYoutube: (options: { videoId: string }) => ReturnType;
    };
  }
}

// A block "atom" node (no editable content) rendering a YouTube iframe —
// mirrors LessonImage's approach: named distinctly, explicit markdown
// serialize/parse so saved lessons store the exact same raw
// <div><iframe></div> HTML block that lesson-markdown.tsx's sanitize
// schema (and its YouTube-only src check) already expects.
export const LessonYoutube = Node.create({
  name: "lessonYoutube",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      videoId: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "iframe[src]",
        getAttrs: (element) => {
          const src = (element as HTMLElement).getAttribute("src") ?? "";
          const match = src.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/);
          return match ? { videoId: match[1] } : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    const videoId = (node.attrs.videoId as string) ?? "";
    return [
      "div",
      { class: WRAPPER_CLASS },
      [
        "iframe",
        mergeAttributes({
          class: IFRAME_CLASS,
          src: embedSrc(videoId),
          title: "YouTube video player",
          allow: IFRAME_ALLOW,
          allowfullscreen: "true",
        }),
      ],
    ];
  },

  addCommands() {
    return {
      setLessonYoutube:
        (options) =>
        (props) =>
          YOUTUBE_ID_RE.test(options.videoId)
            ? insertAtomAndContinue({ type: this.name, attrs: options })(props)
            : false,
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const videoId = (node.attrs.videoId as string) ?? "";
          state.write(
            `<div class="${WRAPPER_CLASS}"><iframe class="${IFRAME_CLASS}" src="${embedSrc(videoId)}" title="YouTube video player" allow="${IFRAME_ALLOW}" allowfullscreen="true"></iframe></div>`
          );
          state.closeBlock(node);
        },
        parse: {
          // Loading existing content is handled by markdown-it (html: true)
          // producing a real <iframe src="..."> element, then parseHTML
          // above reconstructs the node from it.
        },
      } satisfies MarkdownNodeSpec,
    };
  },
});
