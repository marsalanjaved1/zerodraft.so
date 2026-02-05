"use client";

import {
    CheckSquare,
    Code,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Minus,
    Quote,
    Text,
    Image as ImageIcon,
} from "lucide-react";
import { createSuggestionItems, Command, renderItems } from "novel";

// Slash command suggestion items using Novel's createSuggestionItems
export const suggestionItems = createSuggestionItems([
    {
        title: "Text",
        description: "Just start typing with plain text.",
        searchTerms: ["p", "paragraph"],
        icon: <Text size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleNode("paragraph", "paragraph")
                .run();
        },
    },
    {
        title: "Heading 1",
        description: "Large section heading.",
        searchTerms: ["title", "big", "large", "h1"],
        icon: <Heading1 size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode("heading", { level: 1 })
                .run();
        },
    },
    {
        title: "Heading 2",
        description: "Medium section heading.",
        searchTerms: ["subtitle", "medium", "h2"],
        icon: <Heading2 size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode("heading", { level: 2 })
                .run();
        },
    },
    {
        title: "Heading 3",
        description: "Small section heading.",
        searchTerms: ["small", "h3"],
        icon: <Heading3 size={18} />,
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode("heading", { level: 3 })
                .run();
        },
    },
    {
        title: "Bullet List",
        description: "Create a simple bullet list.",
        searchTerms: ["unordered", "point", "ul"],
        icon: <List size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: "Numbered List",
        description: "Create a list with numbering.",
        searchTerms: ["ordered", "ol"],
        icon: <ListOrdered size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: "Task List",
        description: "Create a to-do list with checkboxes.",
        searchTerms: ["todo", "task", "checkbox", "check"],
        icon: <CheckSquare size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: "Quote",
        description: "Create a blockquote.",
        searchTerms: ["blockquote", "quotation"],
        icon: <Quote size={18} />,
        command: ({ editor, range }) =>
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleNode("paragraph", "paragraph")
                .toggleBlockquote()
                .run(),
    },
    {
        title: "Code",
        description: "Create a code block.",
        searchTerms: ["codeblock", "syntax", "programming"],
        icon: <Code size={18} />,
        command: ({ editor, range }) =>
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
        title: "Image",
        description: "Upload an image from your computer.",
        searchTerms: ["photo", "picture", "media"],
        icon: <ImageIcon size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
            // Create file input and trigger click
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
                if (input.files?.length) {
                    const file = input.files[0];
                    // Convert to base64
                    const reader = new FileReader();
                    reader.onload = () => {
                        const url = reader.result as string;
                        // Insert image using insertContent
                        editor
                            .chain()
                            .focus()
                            .insertContent({
                                type: "image",
                                attrs: { src: url },
                            })
                            .run();
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        },
    },
    {
        title: "Divider",
        description: "Insert a horizontal line.",
        searchTerms: ["horizontal", "line", "hr", "rule"],
        icon: <Minus size={18} />,
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
]);

// Slash command extension configured with Novel's Command
export const slashCommand = Command.configure({
    suggestion: {
        items: () => suggestionItems,
        render: renderItems,
    },
});
