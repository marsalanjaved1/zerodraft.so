import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import InlineDiffView from "./InlineDiffView";

export const InlineDiff = Node.create({
    name: "inlineDiff",
    group: "inline",
    inline: true,
    atom: true,

    addAttributes() {
        return {
            original: {
                default: "",
            },
            suggested: {
                default: "",
            },
            changeId: {
                default: null,
            },
            reason: {
                default: "",
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-type='inline-diff']",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(HTMLAttributes, { "data-type": "inline-diff" }),
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(InlineDiffView);
    },
});
