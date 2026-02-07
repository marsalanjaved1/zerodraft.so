"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

interface InlineDiffViewProps extends NodeViewProps { }

export default function InlineDiffView({ node, editor, getPos }: InlineDiffViewProps) {
    const { original, suggested, changeId } = node.attrs;

    const handleAccept = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof getPos === 'function') {
            const pos = getPos();
            if (pos === undefined) return;

            // Delete the diff node and insert the suggested text
            editor.chain()
                .focus()
                .deleteRange({ from: pos, to: pos + node.nodeSize })
                .insertContentAt(pos, suggested)
                .run();
        }
    };

    const handleReject = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof getPos === 'function') {
            const pos = getPos();
            if (pos === undefined) return;

            // Delete the diff node and insert the original text
            editor.chain()
                .focus()
                .deleteRange({ from: pos, to: pos + node.nodeSize })
                .insertContentAt(pos, original)
                .run();
        }
    };

    return (
        <NodeViewWrapper as="span" className="inline-diff-wrapper mx-1 align-baseline inline-flex items-center">
            <span className="diff-removed mr-1 rounded bg-red-100 px-1 py-0.5 text-red-800 line-through decoration-red-500/50 decoration-2">
                {original}
            </span>
            <span className="diff-added rounded bg-green-100 px-1 py-0.5 text-green-800">
                {suggested}
            </span>
            <span className="ml-1 inline-flex items-center gap-1 align-middle select-none" contentEditable={false}>
                <button
                    type="button"
                    onClick={handleAccept}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                    title="Accept change"
                    aria-label="Accept change"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={handleReject}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                    title="Reject change"
                    aria-label="Reject change"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </span>
        </NodeViewWrapper>
    );
}
