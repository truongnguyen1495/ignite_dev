import { z } from "zod";

// Shared shape for every element type an admin can place on a page in the
// interactive-book editor (src/app/admin/library/[itemId]/editor) — the
// single source of truth for both the save action's validation and every
// reader/editor component's rendering, so the two never drift apart.
// Coordinates are fixed design-pixel units relative to the book's own
// LibraryItem.bookWidth/bookHeight, not percentages — see book-page.tsx for
// how the reader scales a whole page to fit its runtime size.
const baseElementSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  zIndex: z.number().int().default(0),
});

const textElementSchema = baseElementSchema.extend({
  type: z.literal("text"),
  content: z.string(),
  fontSize: z.number().positive().default(16),
  color: z.string().default("#111111"),
  align: z.enum(["left", "center", "right"]).default("left"),
  bold: z.boolean().default(false),
});

const imageElementSchema = baseElementSchema.extend({
  type: z.literal("image"),
  // Allowed empty: a freshly-added element has no file yet — the renderer
  // shows an "Ảnh" placeholder for it until the admin uploads one, and the
  // page must still be saveable in that in-progress state.
  url: z.string(),
  alt: z.string().optional(),
});

const shapeElementSchema = baseElementSchema.extend({
  type: z.literal("shape"),
  kind: z.enum(["rectangle", "ellipse"]),
  fill: z.string().default("#3b82f6"),
  borderRadius: z.number().min(0).default(0),
});

const buttonElementSchema = baseElementSchema.extend({
  type: z.literal("button"),
  label: z.string().min(1),
  href: z.string().min(1),
  bgColor: z.string().default("#3b82f6"),
  textColor: z.string().default("#ffffff"),
});

const videoElementSchema = baseElementSchema.extend({
  type: z.literal("video"),
  // Allowed empty — see imageElementSchema's url comment above.
  youtubeId: z.string(),
});

const audioElementSchema = baseElementSchema.extend({
  type: z.literal("audio"),
  // Allowed empty — see imageElementSchema's url comment above.
  url: z.string(),
});

export const bookElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  imageElementSchema,
  shapeElementSchema,
  buttonElementSchema,
  videoElementSchema,
  audioElementSchema,
]);

export const bookPageSchema = z.object({
  backgroundColor: z.string().nullable().optional(),
  backgroundImageUrl: z.string().nullable().optional(),
  elements: z.array(bookElementSchema),
});

export const bookPagesPayloadSchema = z.array(bookPageSchema);

export type BookElement = z.infer<typeof bookElementSchema>;
export type BookElementType = BookElement["type"];
export type BookPageData = z.infer<typeof bookPageSchema>;

export const BOOK_ELEMENT_TYPES: BookElementType[] = [
  "text",
  "image",
  "shape",
  "button",
  "video",
  "audio",
];

// Sensible default size/position for a freshly-added element of each type,
// centered-ish on a typical book page — the editor's "add element" toolbar
// uses these before the admin drags/resizes it into place.
export function createDefaultElement(type: BookElementType, id: string): BookElement {
  const base = { id, x: 40, y: 40, width: 200, height: 100, rotation: 0, zIndex: 0 };
  switch (type) {
    case "text":
      return { ...base, type: "text", content: "Văn bản mới", fontSize: 16, color: "#111111", align: "left", bold: false };
    case "image":
      return { ...base, width: 240, height: 160, type: "image", url: "", alt: "" };
    case "shape":
      return { ...base, width: 160, height: 160, type: "shape", kind: "rectangle", fill: "#3b82f6", borderRadius: 0 };
    case "button":
      return { ...base, width: 160, height: 48, type: "button", label: "Bấm vào đây", href: "#", bgColor: "#3b82f6", textColor: "#ffffff" };
    case "video":
      return { ...base, width: 320, height: 180, type: "video", youtubeId: "" };
    case "audio":
      return { ...base, width: 280, height: 54, type: "audio", url: "" };
  }
}
