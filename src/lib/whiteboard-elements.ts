import { z } from "zod";

// Shared shape for every *placeable* element on a whiteboard
// (src/app/admin/whiteboards/[boardId]) — mirrors baseElementSchema in
// src/lib/library-book-elements.ts, but coordinates are world-space units on
// an infinite canvas (no fixed bookWidth/bookHeight to be relative to).
const baseElementSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  zIndex: z.number().int().default(0),
  // Elements sharing the same non-null groupId behave as one object: a
  // click on any member selects every member (see whiteboard-canvas.tsx's
  // Rnd onMouseDown), and they drag/resize/rotate together (the resize/
  // rotate math lives in whiteboard-canvas.tsx's group gesture handlers).
  // Deliberately a flat shared id rather than a dedicated "group" element
  // wrapping children — connectors are never part of a group (they aren't
  // extended from this base schema at all), and re-grouping a selection
  // that includes an existing group's members just overwrites their old
  // groupId with a new one rather than needing real nesting.
  groupId: z.string().nullable().default(null),
});

const stickyElementSchema = baseElementSchema.extend({
  type: z.literal("sticky"),
  // Plain text, not rich HTML — a whiteboard sticky/mindmap node never needs
  // Tiptap-level per-character formatting, and staying plain text avoids
  // needing an HTML-sanitize pass (sanitizeBookText's job for the book
  // editor's text element) before every save. bold/underline are whole-note
  // toggles (matching Miro's own sticky toolbar, which formats the entire
  // note at once, not a text-selection range) rather than inline markup.
  content: z.string().default(""),
  bgColor: z.string().default("#fef08a"),
  textColor: z.string().default("#111111"),
  fontSize: z.number().positive().default(16),
  bold: z.boolean().default(false),
  underline: z.boolean().default(false),
});

const shapeElementSchema = baseElementSchema.extend({
  type: z.literal("shape"),
  kind: z.enum(["rectangle", "ellipse", "diamond", "triangle", "star"]),
  fill: z.string().default("#3b82f6"),
  stroke: z.string().default("#1d4ed8"),
  borderRadius: z.number().min(0).default(0),
  // A shape can carry a centered text label, same whole-element bold/
  // underline convention as stickyElementSchema above — lets the toolbar's
  // "change shape" control (see selection-toolbar.tsx) swap a sticky for a
  // diamond/star/etc. in place without losing its text.
  content: z.string().default(""),
  textColor: z.string().default("#111111"),
  fontSize: z.number().positive().default(16),
  bold: z.boolean().default(false),
  underline: z.boolean().default(false),
});

const textAlignEnum = z.enum(["left", "center", "right", "justify"]);

// A bare label placed directly on the canvas — no background/border,
// unlike stickyElementSchema/shapeElementSchema — mirrors Miro's dedicated
// "Text" tool. Same whole-element (not per-character) formatting convention
// as sticky/shape, plus the handful of extra controls that only make sense
// for a standalone text block: alignment, a bullet-list rendering of its
// newline-separated lines, and one hyperlink for the whole block.
const textElementSchema = baseElementSchema.extend({
  type: z.literal("text"),
  content: z.string().default(""),
  textColor: z.string().default("#111111"),
  // "transparent" (not empty string) so it's always a valid CSS value to
  // hand straight to backgroundColor with no empty-string special-casing.
  bgColor: z.string().default("transparent"),
  fontSize: z.number().positive().default(24),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  strikethrough: z.boolean().default(false),
  align: textAlignEnum.default("left"),
  bulletList: z.boolean().default(false),
  // Per-range hyperlinks (unlike every other text formatting field on this
  // element, which is whole-element) — [start, end) character offsets into
  // `content`, so a link can cover just a selected word/phrase instead of
  // the entire block. Ranges are kept non-overlapping by construction (see
  // applyTextLink below); rendering (WhiteboardElementRenderer's "text"
  // case) slices `content` against these on every render, same
  // never-store-derived-state convention as connector endpoints. Same
  // SAFE_HREF-style trust boundary concern as library-book-elements.ts's
  // button href doesn't apply here since this only ever opens via a
  // target="_blank" anchor from the admin's own click, never rendered to an
  // untrusted reader.
  links: z
    .array(
      z.object({
        start: z.number().int().min(0),
        end: z.number().int().min(0),
        url: z.string(),
      })
    )
    .default([]),
});

const imageElementSchema = baseElementSchema.extend({
  type: z.literal("image"),
  // Allowed empty — a freshly-added element has no file yet, same
  // convention as library-book-elements.ts's imageElementSchema.
  url: z.string(),
  alt: z.string().optional(),
});

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const videoElementSchema = baseElementSchema.extend({
  type: z.literal("video"),
  youtubeId: z.string().refine((v) => v === "" || YOUTUBE_ID_RE.test(v), {
    message: "youtubeId không hợp lệ.",
  }),
  url: z.string().default(""),
});

const linkCardElementSchema = baseElementSchema.extend({
  type: z.literal("linkCard"),
  url: z.string(),
  // Derived client-side (new URL(url).hostname) at creation time, not
  // re-fetched — see the paste-to-create handler in whiteboard-canvas.tsx.
  domain: z.string().default(""),
  title: z.string().default(""),
});

// A freehand pen stroke — unlike every other placeable type, this is never
// dropped via the toolbar's "add element" list at a default size; it's built
// directly from the points the admin actually drew (see addDrawing in
// whiteboard-editor.tsx), so it has no createDefaultElement case (see
// PlaceableType below, which excludes it for exactly this reason).
// `points` are stored in a fixed LOCAL coordinate space established once at
// draw time (never touched again) — x/y/width/height behave like any other
// element's box and DO change on drag/resize, but the SVG that renders this
// (WhiteboardElementRenderer's "drawing" case) always derives its viewBox
// from `points` alone and lets the browser stretch that fixed drawing to
// fill whatever box width/height currently is. That's what makes resizing a
// drawing "just work" via the exact same <Rnd> resize handles every other
// element already has, with no bespoke resize math of our own.
const drawingElementSchema = baseElementSchema.extend({
  type: z.literal("drawing"),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  color: z.string().default("#18181b"),
  strokeWidth: z.number().positive().default(4),
});

const connectorAnchorEnum = z.enum(["top", "right", "bottom", "left", "center"]);
const connectorKindEnum = z.enum(["straight", "elbow", "curved"]);
const connectorDashEnum = z.enum(["solid", "dashed", "dotted"]);

// Deliberately does NOT extend baseElementSchema — a connector has no
// position/size of its own; its endpoints are derived every render from
// whichever elements sourceId/targetId currently point at (see
// connector-layer.tsx), so it's never stale after either end moves.
const connectorElementSchema = z.object({
  id: z.string().min(1),
  type: z.literal("connector"),
  zIndex: z.number().int().default(0),
  sourceId: z.string().min(1),
  sourceAnchor: connectorAnchorEnum.default("center"),
  targetId: z.string().min(1),
  targetAnchor: connectorAnchorEnum.default("center"),
  stroke: z.string().default("#64748b"),
  strokeWidth: z.number().positive().default(2),
  arrowStart: z.boolean().default(false),
  arrowEnd: z.boolean().default(true),
  // "curved" is the default look (matches real Miro's default), a smooth
  // bezier that leaves each anchor perpendicular to its element's edge —
  // see connectorPathD in connector-layer.tsx for the three kinds' math.
  kind: connectorKindEnum.default("curved"),
  dash: connectorDashEnum.default("solid"),
});

export const whiteboardElementSchema = z.discriminatedUnion("type", [
  stickyElementSchema,
  shapeElementSchema,
  textElementSchema,
  imageElementSchema,
  videoElementSchema,
  linkCardElementSchema,
  drawingElementSchema,
  connectorElementSchema,
]);

export const whiteboardElementsPayloadSchema = z.array(whiteboardElementSchema);

export type WhiteboardElement = z.infer<typeof whiteboardElementSchema>;
export type WhiteboardElementType = WhiteboardElement["type"];
export type ConnectorAnchor = z.infer<typeof connectorAnchorEnum>;
export type ConnectorElement = Extract<WhiteboardElement, { type: "connector" }>;
export type PositionedWhiteboardElement = Exclude<WhiteboardElement, ConnectorElement>;
export type DrawingElement = Extract<WhiteboardElement, { type: "drawing" }>;
// Every type createDefaultElement can stamp out at a sensible default
// size/position — excludes "drawing", which only ever comes from the
// points the admin actually drew (see addDrawing in whiteboard-editor.tsx),
// never from a toolbar click.
export type PlaceableType = Exclude<PositionedWhiteboardElement["type"], "drawing">;
export type ShapeKind = Extract<WhiteboardElement, { type: "shape" }>["kind"];
export type TextElement = Extract<WhiteboardElement, { type: "sticky" }> | Extract<WhiteboardElement, { type: "shape" }>;
export type StandaloneTextElement = Extract<WhiteboardElement, { type: "text" }>;
export type TextAlign = z.infer<typeof textAlignEnum>;
export type ConnectorKind = z.infer<typeof connectorKindEnum>;
export type ConnectorDash = z.infer<typeof connectorDashEnum>;
export type TextLink = StandaloneTextElement["links"][number];

// Splices a new [start, end) link into an existing links array, trimming or
// dropping any ranges it overlaps — links are kept non-overlapping so
// rendering never has to decide which of two links "wins" over the same
// character. Passing an empty `url` removes coverage for that range instead
// of adding a link (the toolbar's "Xóa" action does this).
export function applyTextLink(links: TextLink[], start: number, end: number, url: string): TextLink[] {
  if (start >= end) return links;
  const next: TextLink[] = [];
  for (const link of links) {
    if (link.end <= start || link.start >= end) {
      next.push(link);
      continue;
    }
    if (link.start < start) next.push({ start: link.start, end: start, url: link.url });
    if (link.end > end) next.push({ start: end, end: link.end, url: link.url });
  }
  if (url) next.push({ start, end, url });
  return next.sort((a, b) => a.start - b.start);
}

// The link (if any) fully covering a given [start, end) selection — used to
// prefill the toolbar's URL popover when re-opening it over text that's
// already linked, so editing an existing link doesn't require re-typing
// its URL.
export function findTextLinkCovering(links: TextLink[], start: number, end: number): TextLink | undefined {
  return links.find((l) => l.start <= start && l.end >= end);
}

export function isTextElement(element: WhiteboardElement): element is TextElement {
  return element.type === "sticky" || element.type === "shape";
}

// Broader than isTextElement above — every element type whose content can
// be typed straight onto the canvas (see the double-click handler in
// whiteboard-canvas.tsx), including the standalone "text" element, which
// isn't part of the sticky<->shape kind-switcher's TextElement union (a
// bare text label has no background to preserve when "converting").
export function hasInlineTextEditing(element: WhiteboardElement): element is TextElement | StandaloneTextElement {
  return element.type === "sticky" || element.type === "shape" || element.type === "text";
}

// Converts a sticky<->shape element to a different visual kind while
// preserving its id (so any connector pointing at it stays valid),
// position/size, and text/formatting — backs the "change shape" control in
// selection-toolbar.tsx. `"sticky"` means a plain rounded note; any other
// value is a shapeElementSchema `kind`.
export function convertTextElementKind(element: TextElement, target: "sticky" | ShapeKind): TextElement {
  const shared = {
    id: element.id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    zIndex: element.zIndex,
    groupId: element.groupId,
    content: element.content,
    textColor: element.textColor,
    fontSize: element.fontSize,
    bold: element.bold,
    underline: element.underline,
  };
  const color = element.type === "sticky" ? element.bgColor : element.fill;
  if (target === "sticky") {
    return { ...shared, type: "sticky", bgColor: color };
  }
  return {
    ...shared,
    type: "shape",
    kind: target,
    fill: color,
    stroke: element.type === "shape" ? element.stroke : "#1d4ed8",
    borderRadius: element.type === "shape" ? element.borderRadius : 0,
  };
}

// Every type an admin can drop from the toolbar — connectors are only ever
// created by dragging from one element's anchor to another (see
// whiteboard-canvas.tsx), never via this list.
export const WHITEBOARD_PLACEABLE_TYPES: PlaceableType[] = [
  "sticky",
  "shape",
  "text",
  "image",
  "video",
  "linkCard",
];

export function isConnector(element: WhiteboardElement): element is ConnectorElement {
  return element.type === "connector";
}

// Sensible default size/position for a freshly-added element of each
// placeable type — centered-ish in the current viewport; the editor's
// "add element" toolbar uses these before the admin drags it into place.
export function createDefaultElement(
  type: PlaceableType,
  id: string,
  at?: { x: number; y: number }
): PositionedWhiteboardElement {
  const base = { id, x: at?.x ?? 40, y: at?.y ?? 40, rotation: 0, zIndex: 0, groupId: null };
  switch (type) {
    case "sticky":
      return { ...base, width: 200, height: 160, type: "sticky", content: "", bgColor: "#fef08a", textColor: "#111111", fontSize: 16, bold: false, underline: false };
    case "shape":
      return {
        ...base,
        width: 160,
        height: 160,
        type: "shape",
        kind: "rectangle",
        fill: "#3b82f6",
        stroke: "#1d4ed8",
        borderRadius: 0,
        content: "",
        textColor: "#111111",
        fontSize: 16,
        bold: false,
        underline: false,
      };
    case "text":
      return {
        ...base,
        width: 220,
        height: 50,
        type: "text",
        content: "",
        textColor: "#111111",
        bgColor: "transparent",
        fontSize: 24,
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        align: "left",
        bulletList: false,
        links: [],
      };
    case "image":
      return { ...base, width: 240, height: 160, type: "image", url: "", alt: "" };
    case "video":
      return { ...base, width: 320, height: 180, type: "video", youtubeId: "", url: "" };
    case "linkCard":
      return { ...base, width: 260, height: 90, type: "linkCard", url: "", domain: "", title: "" };
  }
}
