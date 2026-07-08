import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// The content editor lets admins insert a constrained set of raw HTML tags
// (image size/alignment classes, <u> for underline) that plain Markdown has
// no syntax for. rehype-raw parses that raw HTML, and this schema is what
// keeps it safe to render — only these extra tag/attribute combinations are
// allowed on top of rehype-sanitize's default (GitHub-style) allowlist.
const lessonContentSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "alt", "className", "width", "height"],
    div: [...(defaultSchema.attributes?.div ?? []), "className"],
  },
};

export function LessonMarkdown({ content }: { content: string }) {
  return (
    <div className="lesson-content prose max-w-none">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, lessonContentSchema]]}
      >
        {content}
      </Markdown>
    </div>
  );
}
