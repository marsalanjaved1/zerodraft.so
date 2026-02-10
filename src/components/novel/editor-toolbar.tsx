"use client";

import { type EditorInstance } from "novel";
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    CheckSquare,
    Quote,
    Undo,
    Redo,
    Type,
    Heading1,
    Heading2,
    Heading3,
    ChevronDown,
    Sparkles
} from "lucide-react";
import { useState } from "react";
import { ColorSelector } from "./selectors/color-selector";
import { NodeSelector } from "./selectors/node-selector";
import { AISelector } from "./selectors/ai-selector";

interface EditorToolbarProps {
    editor: EditorInstance | null;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded-sm transition-colors ${isActive
                ? "bg-stone-200 text-stone-900"
                : "text-stone-600 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
        >
            {children}
        </button>
    );
}

function ToolbarDivider() {
    return <div className="w-px h-5 bg-stone-200 mx-1" />;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    const [isColorSelectorOpen, setIsColorSelectorOpen] = useState(false);
    const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
    const [isAISelectorOpen, setIsAISelectorOpen] = useState(false);

    if (!editor) return null;

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-stone-200 bg-white sticky top-0 z-30">
            {/* AI Selector */}
            <div className="relative">
                <ToolbarButton
                    onClick={() => {
                        setIsAISelectorOpen(!isAISelectorOpen);
                        setIsColorSelectorOpen(false);
                        setIsNodeSelectorOpen(false);
                    }}
                    isActive={isAISelectorOpen}
                    title="AI Commands"
                >
                    <Sparkles size={16} className="text-purple-600" />
                </ToolbarButton>
                <AISelector
                    editor={editor}
                    isOpen={isAISelectorOpen}
                    setIsOpen={setIsAISelectorOpen}
                />
            </div>

            <ToolbarDivider />

            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo (⌘Z)"
                >
                    <Undo size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo (⌘⇧Z)"
                >
                    <Redo size={16} />
                </ToolbarButton>
            </div>

            <ToolbarDivider />

            {/* Block Type Selector */}
            <NodeSelector
                isOpen={isNodeSelectorOpen}
                setIsOpen={(open) => {
                    setIsNodeSelectorOpen(open);
                    setIsColorSelectorOpen(false);
                }}
            />

            <ToolbarDivider />

            {/* Text Formatting */}
            <div className="flex items-center gap-0.5">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    title="Bold (⌘B)"
                >
                    <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    title="Italic (⌘I)"
                >
                    <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    title="Underline (⌘U)"
                >
                    <Underline size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive("strike")}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive("code")}
                    title="Inline Code"
                >
                    <Code size={16} />
                </ToolbarButton>
            </div>

            <ToolbarDivider />

            {/* Color Selector */}
            <ColorSelector
                isOpen={isColorSelectorOpen}
                setIsOpen={(open) => {
                    setIsColorSelectorOpen(open);
                    setIsNodeSelectorOpen(false);
                }}
            />


            <ToolbarDivider />

            {/* Alignment */}
            <div className="flex items-center gap-0.5">
                <ToolbarButton
                    onClick={() => (editor.chain().focus() as any).setTextAlign("left").run()}
                    isActive={editor.isActive({ textAlign: "left" })}
                    title="Align Left"
                >
                    <AlignLeft size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => (editor.chain().focus() as any).setTextAlign("center").run()}
                    isActive={editor.isActive({ textAlign: "center" })}
                    title="Align Center"
                >
                    <AlignCenter size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => (editor.chain().focus() as any).setTextAlign("right").run()}
                    isActive={editor.isActive({ textAlign: "right" })}
                    title="Align Right"
                >
                    <AlignRight size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => (editor.chain().focus() as any).setTextAlign("justify").run()}
                    isActive={editor.isActive({ textAlign: "justify" })}
                    title="Justify"
                >
                    <AlignJustify size={16} />
                </ToolbarButton>
            </div>

            <ToolbarDivider />

            {/* Lists */}
            <div className="flex items-center gap-0.5">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    title="Bullet List"
                >
                    <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    title="Ordered List"
                >
                    <ListOrdered size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    isActive={editor.isActive("taskList")}
                    title="Check List"
                >
                    <CheckSquare size={16} />
                </ToolbarButton>
            </div>

            <ToolbarDivider />

            <div className="flex items-center gap-0.5">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    title="Quote"
                >
                    <Quote size={16} />
                </ToolbarButton>
            </div>
        </div>
    );
}
