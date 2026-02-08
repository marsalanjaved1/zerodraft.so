"use client";

import { useEffect, useMemo, useState, useCallback, useRef, DragEvent } from "react";
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
import { FileUp, ToggleLeft, ToggleRight } from "lucide-react";
import type { FileNode } from "@/lib/types";

import { defaultExtensions } from "./extensions";
import { slashCommand, suggestionItems } from "./slash-command";
import { EditorBubbleMenu } from "./bubble-menu";
import { SearchBar } from "@/components/SearchBar";
import { useEditorSearch } from "@/lib/hooks/use-editor-search";
import { useGhostText } from "@/lib/hooks/use-ghost-text";

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
    insertText: (text: string) => void;
    applyInlineChange: (original: string, suggested: string, changeId: string) => boolean;
}

interface NovelEditorProps {
    file: FileNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onEditorReady?: (actions: EditorActions) => void;
    onFileImport?: (name: string, content: string) => void;
    enableGhostText?: boolean;
    ghostTextModel?: string;
    onSuggestEdit?: (change: { original: string; suggested: string; reason?: string }) => void;
}

export function NovelEditor({
    file,
    content,
    onContentChange,
    onEditorReady,
    onFileImport,
    enableGhostText = false,
    ghostTextModel = "anthropic/claude-haiku-4.5",
    onSuggestEdit
}: NovelEditorProps) {
    const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
    const [openNode, setOpenNode] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    // Ghost text hook
    const {
        suggestion: ghostSuggestion,
        isLoading: ghostLoading,
        triggerSuggestion,
        accept: acceptGhost,
        dismiss: dismissGhost
    } = useGhostText({
        enabled: enableGhostText,
        model: ghostTextModel,
        context: file ? { fileName: file.name, fileContent: content?.slice(0, 2000) } : undefined
    });

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        for (const file of files) {
            const fileName = file.name;
            const extension = fileName.split('.').pop()?.toLowerCase();

            try {
                let fileContent = '';

                if (extension === 'txt' || extension === 'md' || extension === 'markdown') {
                    fileContent = await file.text();
                    if (extension === 'md' || extension === 'markdown') {
                        fileContent = markdownToHtml(fileContent);
                    }
                } else if (extension === 'json') {
                    const jsonText = await file.text();
                    try {
                        const parsed = JSON.parse(jsonText);
                        fileContent = `<pre><code>${JSON.stringify(parsed, null, 2)}</code></pre>`;
                    } catch {
                        fileContent = `<pre><code>${jsonText}</code></pre>`;
                    }
                } else if (extension === 'html' || extension === 'htm') {
                    fileContent = await file.text();
                } else {
                    try {
                        fileContent = await file.text();
                    } catch {
                        console.warn(`Could not read file: ${fileName}`);
                        continue;
                    }
                }

                if (onFileImport) {
                    onFileImport(fileName, fileContent);
                } else if (editorInstance) {
                    editorInstance.chain().focus().insertContent(fileContent).run();
                }
            } catch (error) {
                console.error(`Error reading file ${fileName}:`, error);
            }
        }
    }, [editorInstance, onFileImport]);

    // Basic Markdown to HTML converter
    const markdownToHtml = (md: string): string => {
        if (!md) return '';

        // First, handle code blocks to avoid messing with their content
        const codeBlocks: string[] = [];
        let html = md.replace(/```([\s\S]*?)```/g, (match, code) => {
            codeBlocks.push(code);
            return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
        });

        // Handle inline code
        const inlineCode: string[] = [];
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            inlineCode.push(code);
            return `__INLINE_CODE_${inlineCode.length - 1}__`;
        });

        html = html
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__([^_]+)__/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_([^_]+)_/g, '<em>$1</em>')
            // Links
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // Lists
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            // Restore code blocks
            .replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => `<pre><code>${codeBlocks[parseInt(index)]}</code></pre>`)
            // Restore inline code
            .replace(/__INLINE_CODE_(\d+)__/g, (match, index) => `<code>${inlineCode[parseInt(index)]}</code>`);

        // Only wrap in paragraphs if there are double newlines and it's not already wrapped
        if (html.includes('\n\n')) {
            html = html.replace(/\n\n/g, '</p><p>');
            // Wrap the whole thing in p if not starting with a block tag
            if (!/^<(h[1-6]|pre|ul|ol|li)/.test(html)) {
                html = `<p>${html}</p>`;
            }
        }

        return html;
    };

    // Apply inline tracked change to editor using styled markers
    const applyInlineChange = useCallback((original: string, suggested: string, changeId: string) => {
        if (!editorInstance) {
            console.warn("applyInlineChange: No editor instance");
            return false;
        }

        // Find the text position in the document
        const { doc } = editorInstance.state;
        let foundPos: number | null = null;
        let foundEndPos: number | null = null;

        // Normalize text checks to handle some whitespace variance and HTML tags
        // If original looks like HTML (starts with <), strip tags to extract text content
        let searchOriginal = original;
        if (original.trim().startsWith('<') && original.includes('>')) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = original;
                searchOriginal = tempDiv.textContent || original;
                console.log("applyInlineChange: Stripped HTML from original:", original, "->", searchOriginal);
            } catch (e) {
                console.warn("applyInlineChange: Failed to strip HTML", e);
            }
        }

        doc.descendants((node, pos) => {
            if (foundPos !== null) return false; // Already found
            if (node.isText && node.text) {
                const index = node.text.indexOf(searchOriginal);
                if (index !== -1) {
                    foundPos = pos + index;
                    foundEndPos = foundPos + searchOriginal.length;
                    return false; // Stop searching
                }
            }
        });

        if (foundPos === null || foundEndPos === null) {
            console.warn("applyInlineChange: Could not find original text in document:", searchOriginal);
            return false;
        }

        console.log("applyInlineChange: Found text at position", foundPos, "to", foundEndPos);

        // Convert suggested text from Markdown to HTML for rendering
        const suggestedHtml = markdownToHtml(suggested);
        console.log("applyInlineChange: Converted suggested text to HTML:", suggestedHtml);

        // Replace the original text with the inlineDiff node
        try {
            editorInstance
                .chain()
                .focus()
                .deleteRange({ from: foundPos, to: foundEndPos })
                .insertContentAt(foundPos, {
                    type: "inlineDiff",
                    attrs: {
                        original,
                        suggested: suggestedHtml, // Store HTML in attribute
                        changeId,
                    }
                })
                .run();

            console.log("applyInlineChange: Successfully applied inline change");
            return true;
        } catch (error) {
            console.error("applyInlineChange: Error applying change:", error);
            return false;
        }
    }, [editorInstance]);

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

    const extensions = useMemo(() => {
        return [...defaultExtensions, slashCommand];
    }, []);

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

    const handleCloseSearch = useCallback(() => {
        setIsSearchOpen(false);
        clearSearch();
    }, [clearSearch]);

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
                insertText: (text: string) => {
                    const html = markdownToHtml(text);
                    editorInstance.chain().focus().insertContent(html).run();
                },
                applyInlineChange,
            };
            onEditorReady(actions);
        }
    }, [editorInstance, onEditorReady]);

    useEffect(() => {
        if (editorInstance && file) {
            let contentToSet = content;
            const extension = file.name.split('.').pop()?.toLowerCase();

            // If it's a markdown file, convert to HTML for display
            if (extension === 'md' || extension === 'markdown') {
                // Check if it already looks like HTML (starts with <) to avoid double conversion
                if (content && !content.trim().startsWith('<')) {
                    contentToSet = markdownToHtml(content);
                }
            }

            // Only update if content is different to avoid cursor jumping
            if (contentToSet !== editorInstance.getHTML()) {
                editorInstance.commands.setContent(contentToSet);
            }
        }
    }, [content, editorInstance, file]);

    if (!file) {
        return (
            <main
                className="flex-1 flex flex-col bg-white overflow-hidden relative items-center justify-center"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {isDragging ? (
                    <div className="absolute inset-0 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg m-4 flex items-center justify-center z-50">
                        <div className="text-center">
                            <FileUp className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
                            <p className="text-lg text-indigo-600 font-medium">Drop file to import</p>
                            <p className="text-sm text-gray-500 mt-2">.txt, .md, .json, .html supported</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400 text-center">
                        <p className="text-sm mb-1">Select a document to start editing</p>
                        <p className="text-xs text-gray-300">or drag & drop a file here</p>
                    </div>
                )}
            </main>
        );
    }

    return (
        <main
            className="flex-1 flex flex-col bg-white overflow-hidden relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg m-2 flex items-center justify-center z-50 pointer-events-none">
                    <div className="text-center bg-white/90 px-8 py-6 rounded-xl shadow-lg">
                        <FileUp className="w-12 h-12 mx-auto mb-3 text-indigo-500" />
                        <p className="text-lg text-indigo-600 font-medium">Drop to insert content</p>
                        <p className="text-sm text-gray-500 mt-1">.txt, .md, .json, .html</p>
                    </div>
                </div>
            )}

            {/* Novel Editor */}
            <div className="flex-1 overflow-y-auto relative">
                <EditorRoot>
                    <EditorContent
                        immediatelyRender={false}
                        extensions={extensions}
                        className="novel-editor px-8 py-8 md:px-16 lg:px-24"
                        editorProps={{
                            handleDOMEvents: {
                                keydown: (_view, event) => {
                                    // Handle Tab to accept ghost text
                                    if (event.key === "Tab" && !event.shiftKey && ghostSuggestion) {
                                        event.preventDefault();
                                        if (editorInstance) {
                                            editorInstance.chain().focus().insertContent(ghostSuggestion).run();
                                        }
                                        acceptGhost();
                                        return true;
                                    }
                                    // Handle Escape to dismiss ghost text
                                    if (event.key === "Escape" && ghostSuggestion) {
                                        event.preventDefault();
                                        dismissGhost();
                                        return true;
                                    }
                                    return handleCommandNavigation(event);
                                },
                            },
                            attributes: {
                                class:
                                    "prose prose-lg max-w-3xl mx-auto focus:outline-none min-h-[500px] font-serif",
                            },
                        }}
                        onUpdate={({ editor }) => {
                            const html = editor.getHTML();
                            onContentChange(html);

                            // Trigger ghost text suggestion after a pause
                            if (enableGhostText) {
                                const text = editor.getText();
                                const cursorPos = editor.state.selection.from;
                                triggerSuggestion(text, cursorPos);
                            }
                        }}
                        onCreate={({ editor }) => {
                            setEditorInstance(editor);
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
                        <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                            <EditorCommandEmpty className="px-2 py-4 text-gray-400 text-center text-sm">
                                No results found
                            </EditorCommandEmpty>
                            <EditorCommandList>
                                {suggestionItems.map((item) => (
                                    <EditorCommandItem
                                        value={item.title}
                                        onCommand={(val) => item.command?.(val)}
                                        key={item.title}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-gray-700 hover:bg-gray-50 aria-selected:bg-indigo-50"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{item.title}</p>
                                            <p className="text-xs text-gray-500">{item.description}</p>
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
