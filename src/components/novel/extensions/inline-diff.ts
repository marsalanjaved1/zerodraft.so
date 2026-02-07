import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import InlineDiffView from "../InlineDiffView";

export interface InlineDiffOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        inlineDiff: {
            insertInlineDiff: (attrs: {
                original: string;
                suggested: string;
                changeId: string;
            }) => ReturnType;
            acceptInlineDiff: (changeId: string) => ReturnType;
            rejectInlineDiff: (changeId: string) => ReturnType;
        };
    }
}

export const InlineDiff = Node.create<InlineDiffOptions>({
    name: "inlineDiff",
    group: "inline",
    inline: true,
    atom: true, // This node is treated as a single unit

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            original: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-original") || "",
                renderHTML: (attributes) => ({
                    "data-original": attributes.original,
                }),
            },
            suggested: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-suggested") || "",
                renderHTML: (attributes) => ({
                    "data-suggested": attributes.suggested,
                }),
            },
            changeId: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-change-id") || "",
                renderHTML: (attributes) => ({
                    "data-change-id": attributes.changeId,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-inline-diff]",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                "data-inline-diff": "true",
                class: "inline-diff-node",
            }),
            // This will be replaced by NodeView, but fallback for non-React rendering
            `${HTMLAttributes["data-original"]} → ${HTMLAttributes["data-suggested"]}`,
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(InlineDiffView);
    },

    addCommands() {
        return {
            insertInlineDiff:
                (attrs) =>
                    ({ chain, state }) => {
                        return chain()
                            .insertContent({
                                type: this.name,
                                attrs,
                            })
                            .run();
                    },
            acceptInlineDiff:
                (changeId) =>
                    ({ tr, state, dispatch }) => {
                        if (!dispatch) return false;

                        const { doc } = state;
                        let changed = false;

                        doc.descendants((node, pos) => {
                            if (node.type.name === this.name && node.attrs.changeId === changeId) {
                                // Replace node with suggested text
                                const suggested = node.attrs.suggested;
                                tr.replaceWith(pos, pos + node.nodeSize, state.schema.text(suggested));
                                changed = true;
                                return false; // Stop iteration after first match
                            }
                        });

                        return changed;
                    },
            rejectInlineDiff:
                (changeId) =>
                    ({ tr, state, dispatch }) => {
                        if (!dispatch) return false;

                        const { doc } = state;
                        let changed = false;

                        doc.descendants((node, pos) => {
                            if (node.type.name === this.name && node.attrs.changeId === changeId) {
                                // Replace node with original text
                                const original = node.attrs.original;
                                tr.replaceWith(pos, pos + node.nodeSize, state.schema.text(original));
                                changed = true;
                                return false; // Stop iteration after first match
                            }
                        });

                        return changed;
                    },
        };
    },
});

export default InlineDiff;
