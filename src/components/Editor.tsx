"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useImperativeHandle, forwardRef } from "react";
import {
    Folder, FileText,
    Bold, Italic, Underline, Strikethrough,
    Heading1, Heading2, Heading3,
    List, ListOrdered, CheckSquare,
    Quote, Code, Minus,
    AlignLeft, AlignCenter, AlignRight,
    Undo, Redo, Highlighter
} from "lucide-react";
import type { FileNode } from "@/app/page";

// Import Tiptap extensions directly
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import HighlightExt from "@tiptap/extension-highlight";

interface EditorProps {
    file: FileNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onEditorReady?: (actions: EditorActions) => void;
}

export interface EditorActions {
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    selectAll: () => void;
    clearFormatting: () => void;
    getHTML: () => string;
    getText: () => string;
    getWordCount: () => { words: number; characters: number };
}

// Configure extensions
const extensions = [
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
    }),
    Placeholder.configure({
        placeholder: "Start writing...",
    }),
    UnderlineExt,
    TaskList,
    TaskItem.configure({
        nested: true,
    }),
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    HighlightExt.configure({
        multicolor: true,
    }),
];

// Toolbar Button Component
function ToolbarButton({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title
}: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded transition-colors ${isActive
                ? 'bg-[#0078d4] text-white'
                : 'text-[#cccccc] hover:bg-[#3c3c3c]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            {children}
        </button>
    );
}

// Toolbar Divider
function ToolbarDivider() {
    return <div className="w-px h-6 bg-[#3c3c3c] mx-1" />;
}

// Formatting Toolbar Component
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
    if (!editor) return null;

    const iconSize = 16;

    return (
        <div className="flex items-center gap-0.5 flex-wrap px-4 py-2 border-b border-[#3c3c3c] bg-[#252526]">
            {/* Text Style */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
            >
                <Bold size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
            >
                <Italic size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline (Ctrl+U)"
            >
                <Underline size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
            >
                <Strikethrough size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                isActive={editor.isActive('highlight')}
                title="Highlight"
            >
                <Highlighter size={iconSize} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                <Heading1 size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                <Heading2 size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                <Heading3 size={iconSize} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
            >
                <ListOrdered size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                isActive={editor.isActive('taskList')}
                title="Task List (Checkboxes)"
            >
                <CheckSquare size={iconSize} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Block Elements */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Quote"
            >
                <Quote size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                title="Code Block"
            >
                <Code size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Line"
            >
                <Minus size={iconSize} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Alignment */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                <AlignLeft size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                <AlignCenter size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                <AlignRight size={iconSize} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Undo/Redo */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo (Ctrl+Z)"
            >
                <Undo size={iconSize} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo (Ctrl+Y)"
            >
                <Redo size={iconSize} />
            </ToolbarButton>
        </div>
    );
}

export function Editor({ file, content, onContentChange, onEditorReady }: EditorProps) {
    const editor = useEditor({
        extensions,
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "tiptap-editor prose prose-invert max-w-none focus:outline-none min-h-[500px]",
            },
        },
        onUpdate: ({ editor }) => {
            onContentChange(editor.getHTML());
        },
    });

    // Expose editor actions to parent
    useEffect(() => {
        if (editor && onEditorReady) {
            const actions: EditorActions = {
                undo: () => editor.chain().focus().undo().run(),
                redo: () => editor.chain().focus().redo().run(),
                canUndo: () => editor.can().undo(),
                canRedo: () => editor.can().redo(),
                selectAll: () => editor.chain().focus().selectAll().run(),
                clearFormatting: () => editor.chain().focus().unsetAllMarks().run(),
                getHTML: () => editor.getHTML(),
                getText: () => editor.getText(),
                getWordCount: () => {
                    const text = editor.getText();
                    return {
                        words: text.trim().split(/\s+/).filter(Boolean).length,
                        characters: text.length,
                    };
                },
            };
            onEditorReady(actions);
        }
    }, [editor, onEditorReady]);

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!file) {
        return (
            <main className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative items-center justify-center">
                <div className="text-[#858585] text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select a file to start editing</p>
                </div>
            </main>
        );
    }

    const pathParts = file.path.split("/").filter(Boolean);

    return (
        <main className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
            {/* Breadcrumbs Bar */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#3c3c3c] bg-[#252526]">
                <div className="flex items-center gap-1.5 text-[13px]">
                    {pathParts.map((part, index) => (
                        <span key={index} className="flex items-center gap-1.5">
                            {index > 0 && <span className="text-[#858585]">/</span>}
                            {index === pathParts.length - 1 ? (
                                <span className="text-[#cccccc] flex items-center gap-1">
                                    <FileText className="w-4 h-4 text-[#519aba]" />
                                    {part}
                                </span>
                            ) : (
                                <span className="text-[#858585] flex items-center gap-1">
                                    <Folder className="w-4 h-4 text-[#dcb67a]" />
                                    {part}
                                </span>
                            )}
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#858585]">Rich Text</span>
                    <span className="text-[11px] text-[#858585]">UTF-8</span>
                </div>
            </div>

            {/* Formatting Toolbar */}
            <EditorToolbar editor={editor} />

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 md:px-16 lg:px-24">
                <div className="max-w-3xl mx-auto">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </main>
    );
}
