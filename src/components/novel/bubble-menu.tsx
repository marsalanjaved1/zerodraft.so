"use client";

import { EditorBubble, useEditor } from "novel";
import { Fragment, useState } from "react";
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    Wand2,
    ChevronDown,
} from "lucide-react";
import { NodeSelector } from "./selectors/node-selector";
import { ColorSelector } from "./selectors/color-selector";

interface BubbleButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
}

function BubbleButton({ isActive, onClick, children, title }: BubbleButtonProps) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-2 transition-colors rounded-sm ${isActive
                ? "bg-stone-100 text-stone-900"
                : "text-stone-600 hover:bg-stone-100"
                }`}
        >
            {children}
        </button>
    );
}

function BubbleDivider() {
    return <div className="w-px h-6 bg-stone-200" />;
}

export function EditorBubbleMenu() {
    const { editor } = useEditor();
    const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
    const [isColorSelectorOpen, setIsColorSelectorOpen] = useState(false);
    const [isAISelectorOpen, setIsAISelectorOpen] = useState(false);

    if (!editor) return null;

    const iconSize = 16;

    return (
        <EditorBubble
            tippyOptions={{
                placement: "top",
            }}
            className="flex items-center bg-white border border-stone-200 rounded-md shadow-lg py-1 px-1 gap-0.5"
        >
            <Fragment>
                {/* AI Actions */}
                <div className="relative">
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-sm transition-colors"
                        title="AI Actions"
                        onClick={() => setIsAISelectorOpen(!isAISelectorOpen)}
                    >
                        <Wand2 size={14} />
                        <span>AI</span>
                        <ChevronDown size={12} />
                    </button>
                    {/* Placeholder for AI Menu - can be expanded later */}
                    {isAISelectorOpen && (
                        <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-1">
                            <button
                                className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-sm"
                                onClick={() => {
                                    /* Todo: Implement AI action */
                                    setIsAISelectorOpen(false);
                                }}
                            >
                                Rewrite Selection
                            </button>
                            <button
                                className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-sm"
                                onClick={() => {
                                    /* Todo: Implement AI action */
                                    setIsAISelectorOpen(false);
                                }}
                            >
                                Improve Writing
                            </button>
                        </div>
                    )}
                </div>

                <BubbleDivider />

                <NodeSelector
                    isOpen={isNodeSelectorOpen}
                    setIsOpen={(open) => {
                        setIsNodeSelectorOpen(open);
                        setIsColorSelectorOpen(false);
                        setIsAISelectorOpen(false);
                    }}
                />

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

                <BubbleButton
                    isActive={editor.isActive("code")}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    title="Inline Code"
                >
                    <Code size={iconSize} />
                </BubbleButton>

                <ColorSelector
                    isOpen={isColorSelectorOpen}
                    setIsOpen={(open) => {
                        setIsColorSelectorOpen(open);
                        setIsNodeSelectorOpen(false);
                        setIsAISelectorOpen(false);
                    }}
                />

            </Fragment>
        </EditorBubble>
    );
}
