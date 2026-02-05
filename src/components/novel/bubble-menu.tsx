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
            className={`p-2 transition-colors ${isActive
                    ? "bg-[#0078d4] text-white"
                    : "text-[#cccccc] hover:bg-[#3c3c3c]"
                }`}
        >
            {children}
        </button>
    );
}

function BubbleDivider() {
    return <div className="w-px h-6 bg-[#3c3c3c]" />;
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
            className="flex items-center bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl overflow-hidden"
        >
            <Fragment>
                {/* Text formatting */}
                <BubbleButton
                    isActive={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={iconSize} />
                </BubbleButton>
                <BubbleButton
                    isActive={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={iconSize} />
                </BubbleButton>
                <BubbleButton
                    isActive={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline (Ctrl+U)"
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
