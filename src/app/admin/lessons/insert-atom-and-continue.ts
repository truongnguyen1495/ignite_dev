import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { CommandProps, JSONContent } from "@tiptap/core";

// Inserting an atom node (image/video embed) via insertContent leaves the
// selection sitting ON the just-inserted node (a NodeSelection) — if the
// admin keeps typing right after, ProseMirror deletes the selected node
// and replaces it with the typed text, silently eating the image/video
// that was just inserted. Moving the selection to a text position after
// the node fixes that without changing anything else about how the node
// itself renders or serializes.
//
// Operates on the command's own `tr`/`commands` (not a fresh `chain()`) —
// chaining a *new* chain from inside a command being run as part of an
// outer chain manages a separate transaction and its fix never reaches
// the one actually dispatched, which is why an earlier version of this
// using `chain()` silently did nothing.
export function insertAtomAndContinue(content: JSONContent) {
  return ({ commands, tr, dispatch, state }: CommandProps): boolean => {
    const inserted = commands.insertContent(content);
    if (inserted && dispatch) {
      const after = tr.selection.to;
      let selection = TextSelection.near(tr.doc.resolve(after), 1);
      if (selection instanceof NodeSelection) {
        // No text position exists on either side yet (e.g. the node is now
        // the very last thing in the doc) — StarterKit's TrailingNode
        // extension would add an empty paragraph too, but only via a
        // separate follow-up transaction dispatched *after* this one, too
        // late to fix the selection here. Insert it ourselves instead.
        tr.insert(after, state.schema.nodes.paragraph.create());
        selection = TextSelection.near(tr.doc.resolve(after + 1), 1);
      }
      tr.setSelection(selection);
    }
    return inserted;
  };
}
