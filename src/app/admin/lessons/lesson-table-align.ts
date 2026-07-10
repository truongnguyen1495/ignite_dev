import { getHTMLFromFragment, type Editor } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode, type Schema } from "@tiptap/pm/model";
import { TableMap, cellAround, findTable } from "@tiptap/pm/tables";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import type { MarkdownNodeSpec } from "tiptap-markdown";

export type ColumnAlign = "left" | "center" | "right" | null;

// Column alignment only (not per-cell) — Markdown/GFM tables have no
// per-cell alignment syntax, only a column-wide delimiter-row marker
// (:---/:---:/---:), so that's the only form that survives a save+reload
// round trip without falling back to raw HTML. "left" is stored as `null`
// (the unmarked default), matching plain `---` in the delimiter row.
const textAlignAttribute = {
  textAlign: {
    default: null as ColumnAlign,
    parseHTML: (element: HTMLElement): ColumnAlign => {
      const align = element.style.textAlign;
      return align === "center" || align === "right" ? align : null;
    },
    renderHTML: (attrs: { textAlign?: ColumnAlign }) =>
      attrs.textAlign ? { style: `text-align: ${attrs.textAlign}` } : {},
  },
};

export const AlignableTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...textAlignAttribute };
  },
});

export const AlignableTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...textAlignAttribute };
  },
});

function cellHasSpan(cell: ProseMirrorNode) {
  return cell.attrs.colspan > 1 || cell.attrs.rowspan > 1;
}

function isPlainCellRow(row: ProseMirrorNode, expectHeader: boolean) {
  let ok = true;
  row.forEach((cell) => {
    if (cellHasSpan(cell) || cell.childCount > 1) ok = false;
    if ((cell.type.name === "tableHeader") !== expectHeader) ok = false;
  });
  return ok;
}

function alignDelimiter(cell: ProseMirrorNode) {
  const align = cell.attrs.textAlign as ColumnAlign;
  if (align === "center") return ":---:";
  if (align === "right") return "---:";
  return "---";
}

// GFM table syntax has no way to record column widths, so a resized table
// can't round-trip through Markdown — only through raw HTML. Widths are read
// off the first row only, which is safe because this function is only
// called once `isPlainCellRow` has confirmed colspan/rowspan are unused
// (each cell then maps 1:1 to a column).
function getColumnWidths(firstRow: ProseMirrorNode): (number | null)[] {
  const widths: (number | null)[] = [];
  firstRow.forEach((cell) => {
    const colwidth = cell.attrs.colwidth as number[] | null;
    widths.push(colwidth?.[0] ?? null);
  });
  return widths;
}

// Tiptap's default HTML export renders a resized cell as `colwidth="140"` —
// not a real HTML attribute browsers honor for sizing — so it would silently
// lose the resize on the student-facing read side (plain remark-gfm/rehype,
// no ProseMirror involved there). Rebuilding a `<colgroup>` with real
// `width` styles, and stripping the meaningless `colwidth` attributes, makes
// the exported HTML render the same width everywhere it's shown.
function tableToWidthPreservingHTML(node: ProseMirrorNode, schema: Schema, widths: (number | null)[]): string {
  const html = getHTMLFromFragment(Fragment.from(node), schema);
  const table = new DOMParser().parseFromString(html, "text/html").querySelector("table");
  if (!table) return html;

  const colgroup = table.ownerDocument.createElement("colgroup");
  for (const width of widths) {
    const col = table.ownerDocument.createElement("col");
    if (width) col.setAttribute("style", `width: ${width}px`);
    colgroup.appendChild(col);
  }
  table.insertBefore(colgroup, table.firstChild);
  table.setAttribute("style", "table-layout: fixed; width: 100%");
  table.querySelectorAll("[colwidth]").forEach((cell) => cell.removeAttribute("colwidth"));

  return table.outerHTML;
}

// Replaces tiptap-markdown's bundled "table" serializer (matched and
// overridden by node name, see tiptap-markdown's getMarkdownSpec) so the
// per-column textAlign attribute above can be reflected as real GFM
// delimiter-row syntax. Mirrors the bundled serializer's own
// clean-table-shape check and raw-HTML fallback for anything irregular
// (e.g. a cell with pasted-in multi-paragraph content) — this app's UI
// can't produce colspan/rowspan, so that part of the check is defensive
// only, but the multi-paragraph-cell case is reachable via paste.
export const AlignableTable = Table.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const rows: ProseMirrorNode[] = [];
          node.forEach((row) => rows.push(row));
          const [firstRow, ...bodyRows] = rows;
          const serializable =
            !!firstRow && isPlainCellRow(firstRow, true) && bodyRows.every((row) => isPlainCellRow(row, false));

          if (!serializable) {
            state.write(getHTMLFromFragment(Fragment.from(node), node.type.schema));
            state.closeBlock(node);
            return;
          }

          const widths = getColumnWidths(firstRow);
          if (widths.some((width) => width !== null)) {
            state.write(tableToWidthPreservingHTML(node, node.type.schema, widths));
            state.closeBlock(node);
            return;
          }

          (state as unknown as { inTable: boolean }).inTable = true;
          rows.forEach((row, i) => {
            state.write("| ");
            row.forEach((cell, _offset, j) => {
              if (j) state.write(" | ");
              const content = cell.firstChild;
              if (content && content.textContent.trim()) {
                state.renderInline(content);
              }
            });
            state.write(" |");
            state.ensureNewLine();
            if (i === 0) {
              const delimiters: string[] = [];
              row.forEach((cell) => delimiters.push(alignDelimiter(cell)));
              state.write(`| ${delimiters.join(" | ")} |`);
              state.ensureNewLine();
            }
          });
          state.closeBlock(node);
          (state as unknown as { inTable: boolean }).inTable = false;
        },
        parse: {
          // handled by markdown-it
        },
      } satisfies MarkdownNodeSpec,
    };
  },
});

// Applies to every cell in the current column (not just the current cell),
// since that's the only alignment granularity Markdown tables support.
export function setColumnAlign(editor: Editor | null, align: ColumnAlign) {
  if (!editor) return;
  const { state, view } = editor;
  const $cell = cellAround(state.selection.$from);
  if (!$cell) return;
  const table = findTable($cell);
  if (!table) return;

  const map = TableMap.get(table.node);
  const cellRelPos = $cell.pos - table.start;
  const rect = map.findCell(cellRelPos);
  const columnRelPositions = map.cellsInRect({ left: rect.left, right: rect.left + 1, top: 0, bottom: map.height });

  const tr = state.tr;
  for (const relPos of columnRelPositions) {
    const absPos = table.start + relPos;
    const cellNode = tr.doc.nodeAt(absPos);
    if (cellNode) {
      tr.setNodeMarkup(absPos, undefined, { ...cellNode.attrs, textAlign: align });
    }
  }
  view.dispatch(tr);
  editor.commands.focus();
}
