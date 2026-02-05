"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
    EditorRoot,
    EditorContent,
    EditorCommand,
    EditorCommandItem,
    EditorCommandEmpty,
    EditorCommandList,
    handleCommandNavigation,
} from "novel";
import type { EditorInstance } from "novel";
import { Folder, FileText } from "lucide-react";
import type { FileNode } from "@/app/page";

import { defaultExtensions } from "./extensions";
import { slashCommand, suggestionItems } from "./slash-command";
import { EditorBubbleMenu } from "./bubble-menu";
import { SearchBar } from "@/components/SearchBar";
import { useEditorSearch } from "@/lib/hooks/use-editor-search";

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

interface NovelEditorProps {
    file: FileNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onEditorReady?: (actions: EditorActions) => void;
}

export function NovelEditor({
    file,
    content,
    onContentChange,
    onEditorReady,
}: NovelEditorProps) {
    const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
    const [openNode, setOpenNode] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Search functionality
    const {
        query: searchQuery,
        setQuery: setSearchQuery,
        matchCount,
        currentIndex,
        goToNext,
        goToPrevious,
        replace,
        replaceAll,
        clear: clearSearch,
    } = useEditorSearch({ editor: editorInstance });

    // Extensions including slash command
    const extensions = useMemo(() => {
        return [...defaultExtensions, slashCommand];
    }, []);

    // Keyboard shortcuts for search (Cmd+F)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close search and clear
    const handleCloseSearch = useCallback(() => {
        setIsSearchOpen(false);
        clearSearch();
    }, [clearSearch]);

    // Expose editor actions when editor is ready
    useEffect(() => {
        if (editorInstance && onEditorReady) {
            const actions: EditorActions = {
                undo: () => editorInstance.chain().focus().undo().run(),
                redo: () => editorInstance.chain().focus().redo().run(),
                canUndo: () => editorInstance.can().undo(),
                canRedo: () => editorInstance.can().redo(),
                selectAll: () => editorInstance.chain().focus().selectAll().run(),
                clearFormatting: () =>
                    editorInstance.chain().focus().unsetAllMarks().run(),
                getHTML: () => editorInstance.getHTML(),
                getText: () => editorInstance.getText(),
                getWordCount: () => {
                    const text = editorInstance.getText();
                    return {
                        words: text.trim().split(/\s+/).filter(Boolean).length,
                        characters: text.length,
                    };
                },
            };
            onEditorReady(actions);
        }
    }, [editorInstance, onEditorReady]);

    // Update content when file changes
    useEffect(() => {
        if (editorInstance && content !== editorInstance.getHTML()) {
            editorInstance.commands.setContent(content);
        }
    }, [content, editorInstance]);

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
                    <span className="text-[11px] text-[#858585]">Novel Editor</span>
                    <span className="text-[11px] text-[#858585]">UTF-8</span>
                </div>
            </div>

            {/* Novel Editor */}
            <div className="flex-1 overflow-y-auto relative">
                <EditorRoot>
                    <EditorContent
                        immediatelyRender={false}
                        extensions={extensions}
                        className="novel-editor px-8 py-6 md:px-16 lg:px-24"
                        editorProps={{
                            handleDOMEvents: {
                                keydown: (_view, event) => handleCommandNavigation(event),
                            },
                            attributes: {
                                class:
                                    "prose prose-invert prose-lg max-w-3xl mx-auto focus:outline-none min-h-[500px]",
                            },
                        }}
                        onUpdate={({ editor }) => {
                            onContentChange(editor.getHTML());
                        }}
                        onCreate={({ editor }) => {
                            setEditorInstance(editor);
                            // Set initial content if provided
                            if (content) {
                                editor.commands.setContent(content);
                            }
                        }}
                    >
                        {/* Bubble Menu */}
                        <EditorBubbleMenu />

                        {/* Search Bar */}
                        <SearchBar
                            isOpen={isSearchOpen}
                            onClose={handleCloseSearch}
                            onSearch={setSearchQuery}
                            onNext={goToNext}
                            onPrevious={goToPrevious}
                            onReplace={replace}
                            onReplaceAll={replaceAll}
                            matchCount={matchCount}
                            currentMatch={currentIndex}
                        />

                        {/* Slash Command Menu */}
                        <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-lg border border-[#3c3c3c] bg-[#252526] p-2 shadow-2xl">
                            <EditorCommandEmpty className="px-2 py-4 text-[#858585] text-center">
                                No results found
                            </EditorCommandEmpty>
                            <EditorCommandList>
                                {suggestionItems.map((item) => (
                                    <EditorCommandItem
                                        value={item.title}
                                        onCommand={(val) => item.command?.(val)}
                                        key={item.title}
                                        className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-[#cccccc] hover:bg-[#3c3c3c] aria-selected:bg-[#3c3c3c]"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc]">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.title}</p>
                                            <p className="text-xs text-[#858585]">{item.description}</p>
                                        </div>
                                    </EditorCommandItem>
                                ))}
                            </EditorCommandList>
                        </EditorCommand>
                    </EditorContent>
                </EditorRoot>
            </div>
        </main>
    );
}
