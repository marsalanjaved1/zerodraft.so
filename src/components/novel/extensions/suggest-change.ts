import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// ─── Suggest Deletion Mark ───────────────────────────────────────────────────
// Applied to original text that the AI wants to remove.
// Renders as red strikethrough.

export interface SuggestDeletionOptions {
    HTMLAttributes: Record<string, any>;
}

export const SuggestDeletion = Mark.create<SuggestDeletionOptions>({
    name: "suggestDeletion",
    priority: 1000,
    excludes: "", // allow other marks to coexist
    inclusive: false,

    addOptions() {
        return { HTMLAttributes: {} };
    },

    addAttributes() {
        return {
            changeId: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-change-id"),
                renderHTML: (attrs) => ({ "data-change-id": attrs.changeId }),
            },
        };
    },

    parseHTML() {
        return [{ tag: "del[data-suggest-deletion]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "del",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                "data-suggest-deletion": "true",
                class: "suggest-deletion",
            }),
            0,
        ];
    },
});

// ─── Suggest Insertion Mark ──────────────────────────────────────────────────
// Applied to new text the AI wants to add.
// Renders as green highlight.

export interface SuggestInsertionOptions {
    HTMLAttributes: Record<string, any>;
}

export const SuggestInsertion = Mark.create<SuggestInsertionOptions>({
    name: "suggestInsertion",
    priority: 1000,
    excludes: "", // allow other marks to coexist
    inclusive: false,

    addOptions() {
        return { HTMLAttributes: {} };
    },

    addAttributes() {
        return {
            changeId: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-change-id"),
                renderHTML: (attrs) => ({ "data-change-id": attrs.changeId }),
            },
        };
    },

    parseHTML() {
        return [{ tag: "ins[data-suggest-insertion]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "ins",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                "data-suggest-insertion": "true",
                class: "suggest-insertion",
            }),
            0,
        ];
    },
});

// ─── SuggestChange Plugin ────────────────────────────────────────────────────
// A ProseMirror plugin that renders accept/reject buttons via decorations
// at the end of each change group.

const suggestChangePluginKey = new PluginKey("suggestChange");

function findChangeGroups(doc: any): Map<string, { from: number; to: number; hasDeletion: boolean; hasInsertion: boolean }> {
    const groups = new Map<string, { from: number; to: number; hasDeletion: boolean; hasInsertion: boolean }>();

    doc.descendants((node: any, pos: number) => {
        if (!node.isText) return;

        for (const mark of node.marks) {
            if (mark.type.name === "suggestDeletion" || mark.type.name === "suggestInsertion") {
                const changeId = mark.attrs.changeId;
                if (!changeId) continue;

                const existing = groups.get(changeId);
                const nodeEnd = pos + node.nodeSize;

                if (existing) {
                    existing.from = Math.min(existing.from, pos);
                    existing.to = Math.max(existing.to, nodeEnd);
                    if (mark.type.name === "suggestDeletion") existing.hasDeletion = true;
                    if (mark.type.name === "suggestInsertion") existing.hasInsertion = true;
                } else {
                    groups.set(changeId, {
                        from: pos,
                        to: nodeEnd,
                        hasDeletion: mark.type.name === "suggestDeletion",
                        hasInsertion: mark.type.name === "suggestInsertion",
                    });
                }
            }
        }
    });

    return groups;
}

export function createSuggestChangePlugin() {
    return new Plugin({
        key: suggestChangePluginKey,
        props: {
            decorations(state) {
                const { doc } = state;
                const groups = findChangeGroups(doc);
                const decorations: Decoration[] = [];

                for (const [changeId, group] of groups) {
                    // Add a widget decoration at the end of the change group
                    const widget = Decoration.widget(group.to, (view) => {
                        const wrapper = document.createElement("span");
                        wrapper.className = "suggest-change-actions";
                        wrapper.contentEditable = "false";

                        const acceptBtn = document.createElement("button");
                        acceptBtn.className = "suggest-change-accept";
                        acceptBtn.title = "Accept change";
                        acceptBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                        acceptBtn.addEventListener("click", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Dispatch accept
                            const tr = view.state.tr;
                            acceptSuggestChange(tr, view.state, changeId);
                            view.dispatch(tr);
                        });

                        const rejectBtn = document.createElement("button");
                        rejectBtn.className = "suggest-change-reject";
                        rejectBtn.title = "Reject change";
                        rejectBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                        rejectBtn.addEventListener("click", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const tr = view.state.tr;
                            rejectSuggestChange(tr, view.state, changeId);
                            view.dispatch(tr);
                        });

                        wrapper.appendChild(acceptBtn);
                        wrapper.appendChild(rejectBtn);
                        return wrapper;
                    }, { side: 1 });

                    decorations.push(widget);
                }

                return DecorationSet.create(doc, decorations);
            },
        },
    });
}

// ─── Transaction Helpers ─────────────────────────────────────────────────────
// These operate on the ProseMirror transaction to accept/reject changes.

// ─── Transaction Helpers ─────────────────────────────────────────────────────
// These operate on the ProseMirror transaction to accept/reject changes.

function acceptSuggestChange(tr: any, state: any, changeId: string) {
    console.log(`[SuggestChange] Accepting change ${changeId}`);
    const { doc } = state;
    const deletionType = state.schema.marks.suggestDeletion;
    const insertionType = state.schema.marks.suggestInsertion;

    // Collect all ranges to process (in reverse order to avoid position shifts)
    const deletions: { from: number; to: number }[] = [];
    const insertions: { from: number; to: number }[] = [];

    doc.descendants((node: any, pos: number) => {
        if (!node.isText) return;

        for (const mark of node.marks) {
            if (mark.type.name === "suggestDeletion" || mark.type.name === "suggestInsertion") {
                const markId = mark.attrs.changeId;
                const match = markId === changeId;

                if (match) {
                    const range = { from: pos, to: pos + node.nodeSize };
                    if (mark.type.name === "suggestDeletion") {
                        deletions.push(range);
                    } else {
                        insertions.push(range);
                    }
                }
            }
        }
    });

    // Process in reverse order to maintain positions
    // Accept = remove deleted text, keep inserted text (just remove marks)

    // First delete the deletion-marked text (destructive action first)
    for (const range of deletions.sort((a, b) => b.from - a.from)) {
        const from = tr.mapping.map(range.from);
        const to = tr.mapping.map(range.to);
        tr.delete(from, to);
    }

    // Then remove insertion marks (keep the text)
    for (const range of insertions.sort((a, b) => b.from - a.from)) {
        const from = tr.mapping.map(range.from);
        const to = tr.mapping.map(range.to);
        tr.removeMark(from, to, insertionType);
    }
}

function rejectSuggestChange(tr: any, state: any, changeId: string) {
    const { doc } = state;
    const deletionType = state.schema.marks.suggestDeletion;
    const insertionType = state.schema.marks.suggestInsertion;

    const deletions: { from: number; to: number }[] = [];
    const insertions: { from: number; to: number }[] = [];

    doc.descendants((node: any, pos: number) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
            if (mark.attrs.changeId !== changeId) continue;
            const range = { from: pos, to: pos + node.nodeSize };

            if (mark.type.name === "suggestDeletion") {
                deletions.push(range);
            } else if (mark.type.name === "suggestInsertion") {
                insertions.push(range);
            }
        }
    });

    // Reject = keep original text (remove deletion marks), remove inserted text

    // First remove the inserted text
    for (const range of insertions.sort((a, b) => b.from - a.from)) {
        const from = tr.mapping.map(range.from);
        const to = tr.mapping.map(range.to);
        tr.delete(from, to);
    }

    // Then remove deletion marks (keep the text)
    for (const range of deletions.sort((a, b) => b.from - a.from)) {
        const from = tr.mapping.map(range.from);
        const to = tr.mapping.map(range.to);
        tr.removeMark(from, to, deletionType);
    }
}

// ─── Exported Accept/Reject All Helpers ──────────────────────────────────────

export function acceptAllSuggestChanges(tr: any, state: any) {
    const groups = findChangeGroups(state.doc);
    // Process each group — but since positions shift, we re-find after each
    for (const changeId of groups.keys()) {
        acceptSuggestChange(tr, { doc: tr.doc, schema: state.schema }, changeId);
    }
}

export function rejectAllSuggestChanges(tr: any, state: any) {
    const groups = findChangeGroups(state.doc);
    for (const changeId of groups.keys()) {
        rejectSuggestChange(tr, { doc: tr.doc, schema: state.schema }, changeId);
    }
}
