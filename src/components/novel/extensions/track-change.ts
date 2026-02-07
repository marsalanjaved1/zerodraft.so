import { Mark, mergeAttributes } from "@tiptap/core";

export interface TrackChangeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        trackChange: {
            setTrackChange: (attrs: { type: "deletion" | "insertion"; changeId: string }) => ReturnType;
            unsetTrackChange: () => ReturnType;
            acceptChange: (changeId: string) => ReturnType;
            rejectChange: (changeId: string) => ReturnType;
        };
    }
}

export const TrackChange = Mark.create<TrackChangeOptions>({
    name: "trackChange",

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            type: {
                default: "insertion",
                parseHTML: (element) => element.getAttribute("data-change-type"),
                renderHTML: (attributes) => ({
                    "data-change-type": attributes.type,
                }),
            },
            changeId: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-change-id"),
                renderHTML: (attributes) => ({
                    "data-change-id": attributes.changeId,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-change-type]",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const type = HTMLAttributes["data-change-type"];
        const baseClasses = type === "deletion"
            ? "track-change-deletion"
            : "track-change-insertion";

        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: baseClasses,
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setTrackChange:
                (attrs) =>
                    ({ commands }) => {
                        return commands.setMark(this.name, attrs);
                    },
            unsetTrackChange:
                () =>
                    ({ commands }) => {
                        return commands.unsetMark(this.name);
                    },
            acceptChange:
                (changeId) =>
                    ({ tr, state, dispatch }) => {
                        const { doc } = state;
                        let changed = false;

                        doc.descendants((node, pos) => {
                            node.marks.forEach((mark) => {
                                if (mark.type.name === this.name && mark.attrs.changeId === changeId) {
                                    if (mark.attrs.type === "deletion") {
                                        // Remove deleted text
                                        if (dispatch) {
                                            tr.delete(pos, pos + node.nodeSize);
                                        }
                                    } else {
                                        // Keep inserted text but remove mark
                                        if (dispatch) {
                                            tr.removeMark(pos, pos + node.nodeSize, mark.type);
                                        }
                                    }
                                    changed = true;
                                }
                            });
                        });

                        return changed;
                    },
            rejectChange:
                (changeId) =>
                    ({ tr, state, dispatch }) => {
                        const { doc } = state;
                        let changed = false;

                        doc.descendants((node, pos) => {
                            node.marks.forEach((mark) => {
                                if (mark.type.name === this.name && mark.attrs.changeId === changeId) {
                                    if (mark.attrs.type === "insertion") {
                                        // Remove inserted text
                                        if (dispatch) {
                                            tr.delete(pos, pos + node.nodeSize);
                                        }
                                    } else {
                                        // Keep original text but remove mark
                                        if (dispatch) {
                                            tr.removeMark(pos, pos + node.nodeSize, mark.type);
                                        }
                                    }
                                    changed = true;
                                }
                            });
                        });

                        return changed;
                    },
        };
    },
});

export default TrackChange;
