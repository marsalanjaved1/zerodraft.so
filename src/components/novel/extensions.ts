"use client";

import {
    TiptapImage,
    TiptapLink,
    TaskList,
    TaskItem,
    StarterKit,
    TiptapUnderline,
    HorizontalRule,
    Placeholder,
    HighlightExtension,
} from "novel";

// Placeholder configuration - using Novel's bundled version
const placeholder = Placeholder.configure({
    placeholder: ({ node }) => {
        if (node.type.name === "heading") {
            return `Heading ${node.attrs.level || ""}`;
        }
        return "Press '/' for commands...";
    },
    includeChildren: true,
});

// Link extension - Novel's bundled version
const tiptapLink = TiptapLink.configure({
    HTMLAttributes: {
        class: "text-[#569cd6] underline underline-offset-[3px] hover:text-[#6cb6ff] transition-colors cursor-pointer",
    },
});

// Image extension - Novel's bundled version
const tiptapImage = TiptapImage.configure({
    allowBase64: true,
    HTMLAttributes: {
        class: "rounded-lg border border-[#3c3c3c]",
    },
});

// Task list configuration - Novel's bundled version
const taskList = TaskList.configure({
    HTMLAttributes: {
        class: "not-prose pl-2",
    },
});

const taskItem = TaskItem.configure({
    HTMLAttributes: {
        class: "flex items-start gap-2 my-1",
    },
    nested: true,
});

// Horizontal rule - Novel's bundled version
const horizontalRule = HorizontalRule.configure({
    HTMLAttributes: {
        class: "mt-4 mb-6 border-t border-[#3c3c3c]",
    },
});

// Starter kit with customizations - Novel's bundled version
const starterKit = StarterKit.configure({
    bulletList: {
        HTMLAttributes: {
            class: "list-disc list-outside leading-3 -mt-2 pl-6",
        },
    },
    orderedList: {
        HTMLAttributes: {
            class: "list-decimal list-outside leading-3 -mt-2 pl-6",
        },
    },
    listItem: {
        HTMLAttributes: {
            class: "leading-normal -mb-2",
        },
    },
    blockquote: {
        HTMLAttributes: {
            class: "border-l-4 border-[#0078d4] pl-4 text-[#a0a0a0] italic",
        },
    },
    codeBlock: {
        HTMLAttributes: {
            class: "rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] p-4 font-mono text-sm",
        },
    },
    code: {
        HTMLAttributes: {
            class: "rounded bg-[#2d2d2d] px-1.5 py-0.5 font-mono text-sm text-[#ce9178] before:content-none after:content-none",
        },
    },
    horizontalRule: false,
    dropcursor: {
        color: "#0078d4",
        width: 4,
    },
    gapcursor: false,
});

// Highlight extension - Novel's bundled version
const highlight = HighlightExtension.configure({
    multicolor: true,
    HTMLAttributes: {
        class: "bg-[#264f78] rounded px-0.5",
    },
});

// Underline - Novel's bundled version
const underline = TiptapUnderline;

// Export all extensions - all from Novel to avoid version conflicts
export const defaultExtensions = [
    starterKit,
    placeholder,
    tiptapLink,
    tiptapImage,
    taskList,
    taskItem,
    horizontalRule,
    highlight,
    underline,
];
