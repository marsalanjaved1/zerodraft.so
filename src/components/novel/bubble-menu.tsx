"use client";

import { EditorBubble, useEditor } from "novel";
import { Fragment, type ReactNode } from "react";
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    Highlighter,
    Wand2,
    ChevronDown,
} from "lucide-react";

interface BubbleButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: ReactNode;
    title: string;
}

function BubbleButton({ isActive, onClick, children, title }: BubbleButtonProps) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-2 transition-colors rounded ${isActive
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
                }`}
        >
            {children}
        </button>
    );
}

function BubbleDivider() {
    return <div className="w-px h-6 bg-gray-200" />;
}

export function EditorBubbleMenu() {
    const { editor } = useEditor();

    if (!editor) return null;

    const iconSize = 16;

    return (
        <EditorBubble
            tippyOptions={{
                placement: "top",
            }}
            className="flex items-center bg-white border border-gray-200 rounded-xl shadow-lg py-1 px-1 gap-0.5"
        >
            <Fragment>
                {/* AI Actions */}
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="AI Actions"
                >
                    <Wand2 size={14} />
                    <span>Rewrite</span>
                    <ChevronDown size={12} />
                </button>

                <BubbleDivider />

                {/* Text formatting */}
                <BubbleButton
                    isActive={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold (⌘B)"
                >
                    <Bold size={iconSize} />
                </BubbleButton>
                <BubbleButton
                    isActive={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italic (⌘I)"
                >
                    <Italic size={iconSize} />
                </BubbleButton>
                <BubbleButton
                    isActive={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline (⌘U)"
                >
                    <Underline size={iconSize} />
                </BubbleButton>
                <BubbleButton
                    isActive={editor.isActive("strike")}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="Strikethrough"
                >
                    <Strikethrough size={iconSize} />
                </BubbleButton>

                <BubbleDivider />

                {/* Code & Highlight */}
                <BubbleButton
                    isActive={editor.isActive("code")}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    title="Inline Code"
                >
                    <Code size={iconSize} />
                </BubbleButton>
                <BubbleButton
                    isActive={editor.isActive("highlight")}
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    title="Highlight"
                >
                    <Highlighter size={iconSize} />
                </BubbleButton>
            </Fragment>
        </EditorBubble>
    );
}
