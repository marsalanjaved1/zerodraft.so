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
import { EditorToolbar } from "./editor-toolbar";
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
    applyInlineChange: (startLine: number, endLine: number, replacementText: string, expectedText: string | undefined, changeId: string) => boolean | string;
    applyInlineInsertion?: (afterLine: number, textToInsert: string) => boolean | string;
}

interface NovelEditorProps {
    file: FileNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onEditorReady?: (actions: EditorActions) => void;
    onFileImport?: (name: string, content: string) => void;
    enableGhostText?: boolean;
    ghostTextModel?: string;
    onSuggestEdit?: (change: { startLine: number; endLine: number; replacementText: string; expectedText?: string; reason?: string }) => void;
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
    const [isFullWidth, setIsFullWidth] = useState(false);
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
        context: file ? { fileName: file.name, fileContent: content } : undefined
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
                        fileContent = (editorInstance?.storage as any)?.markdown?.parser.parse(fileContent) || fileContent;
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



    // Helper to map line numbers to ProseMirror positions.
    // CRITICAL: must count lines the SAME way the backend's numberLines() does:
    //   content.split('\n') — every newline-delimited substring is a "line".
    // We extract the editor's markdown, split by \n, then map character offsets
    // back to ProseMirror doc positions.
    const lineRangeToProseMirrorPos = useCallback((startLine: number, endLine: number) => {
        if (!editorInstance) return null;
        const { doc } = editorInstance.state;

        // Get markdown text (same format the backend sees via editorContent)
        const markdown: string = (editorInstance.storage as any).markdown?.getMarkdown() || editorInstance.getText();
        const lines = markdown.split('\n');

        if (startLine < 1 || endLine > lines.length || startLine > endLine) return null;

        // Instead of complex character-offset-to-PM-pos mapping, 
        // use textblock approach: each textblock node is one "content line" 
        // in the ProseMirror doc. But blank markdown lines don't have textblocks.
        // So we map: for each non-blank markdown line, there's a textblock.
        // For blank lines, they exist between textblocks.

        // Simplest robust approach: walk textblock nodes and build a bidirectional map
        // between markdown line indices and textblock positions.
        type LineInfo = { from: number; to: number };
        const textblocks: LineInfo[] = [];

        doc.descendants((node, pos) => {
            if (node.isTextblock) {
                textblocks.push({ from: pos, to: pos + node.nodeSize });
                return false;
            }
            return true;
        });

        // Map markdown line numbers to textblock indices.
        // Skip blank lines in markdown — they don't correspond to textblocks.
        // Build: contentLineIndex[markdownLineNumber] = textblockIndex (or -1 for blank)
        let textblockIdx = 0;
        const lineToBlock: (number | null)[] = []; // 0-indexed markdown lines -> textblock index
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '') {
                lineToBlock.push(null); // blank line, no textblock
            } else {
                lineToBlock.push(textblockIdx < textblocks.length ? textblockIdx : null);
                textblockIdx++;
            }
        }

        // Find the first and last non-blank lines in [startLine, endLine] range
        let fromBlock: number | null = null;
        let toBlock: number | null = null;
        for (let i = startLine - 1; i <= endLine - 1; i++) {
            const blockIdx = lineToBlock[i];
            if (blockIdx !== null && blockIdx !== undefined) {
                if (fromBlock === null) fromBlock = blockIdx;
                toBlock = blockIdx;
            }
        }

        if (fromBlock === null || toBlock === null) return null;
        if (fromBlock >= textblocks.length || toBlock >= textblocks.length) return null;

        return { from: textblocks[fromBlock].from, to: textblocks[toBlock].to };
    }, [editorInstance]);


    // Apply inline tracked change using line numbers
    const applyInlineChange = useCallback((startLine: number, endLine: number, replacementText: string, expectedText: string | undefined, changeId: string): boolean | string => {
        if (!editorInstance) {
            return "FILE_NOT_OPEN: No document is open. Open the document first.";
        }

        const pos = lineRangeToProseMirrorPos(startLine, endLine);
        if (!pos) {
            return `INVALID_RANGE: Lines ${startLine}-${endLine} are out of range. The document might have fewer lines than you think.`;
        }

        // Safety check: verify content hasn't drifted
        if (expectedText) {
            const actual = editorInstance.state.doc.textBetween(pos.from, pos.to, '\n');
            const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
            // We check if the actual text roughly matches expected. 
            // We use inclusive check because 'actual' might contain block markup/newlines that 'expected' doesn't.
            // Or exact match?
            // Let's iterate: if the normalized expected text isn't found in normalized actual, warn.
            const normActual = normalize(actual);
            const normExpected = normalize(expectedText);

            // Allow for some leniency, e.g. if the user provided just the text content but we grabbed block content
            if (!normActual.includes(normExpected) && !normExpected.includes(normActual)) {
                return `STALE: Document content has changed. Lines ${startLine}-${endLine} now contain: "${actual.slice(0, 100)}...". Re-read the document and retry.`;
            }
        }

        const suggestedHtml = (editorInstance.storage as any).markdown?.parser.parse(replacementText) || replacementText;

        try {
            editorInstance
                .chain()
                .focus()
                .deleteRange({ from: pos.from, to: pos.to })
                .insertContentAt(pos.from, {
                    type: "inlineDiff",
                    attrs: {
                        original: expectedText || "", // We use expectedText as the "original" to show in diff
                        suggested: suggestedHtml,
                        changeId,
                    }
                })
                .run();

            return true;
        } catch (error: any) {
            return `Edit failed: ${error.message}`;
        }
    }, [editorInstance, lineRangeToProseMirrorPos]);

    // Apply inline insertion using line numbers
    const applyInlineInsertion = useCallback((afterLine: number, textToInsert: string): boolean | string => {
        if (!editorInstance) return "FILE_NOT_OPEN: No document is open.";

        let insertPos = 0;

        if (afterLine === 0) {
            // Insert at top of document
            insertPos = 0;
        } else {
            // We want to insert AFTER line X. So we find the range of line X, and take the position "to".
            const pos = lineRangeToProseMirrorPos(afterLine, afterLine);
            if (!pos) return `INVALID_RANGE: Line ${afterLine} does not exist.`;
            insertPos = pos.to;
        }

        const suggestedHtml = (editorInstance.storage as any).markdown?.parser.parse(textToInsert) || textToInsert;

        try {
            editorInstance
                .chain()
                .focus()
                .insertContentAt(insertPos, {
                    type: "inlineDiff",
                    attrs: {
                        original: "",
                        suggested: suggestedHtml,
                        changeId: `insert-${Date.now()}`,
                    }
                })
                // Maybe insert a newline after if it's a block insertion? 
                // The InlineDiff is inline, but if the content is block-like, simple insertion might merge.
                // Ideally we'd insert a paragraph break if appending to a paragraph?
                // But let's trust ProseMirror schema to handle insertion validity or the HTML content.
                .run();

            return true;
        } catch (error: any) {
            return `Insertion failed: ${error.message}`;
        }
    }, [editorInstance, lineRangeToProseMirrorPos]);

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
                    const html = (editorInstance.storage as any).markdown?.parser.parse(text) || text;
                    editorInstance.chain().focus().insertContent(html).run();
                },
                applyInlineChange,
                applyInlineInsertion,
            };
            onEditorReady(actions);
        }
    }, [editorInstance, onEditorReady, applyInlineChange, applyInlineInsertion]);

    const lastFileIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (editorInstance && file) {
            let contentToSet = content;
            const extension = file.name.split('.').pop()?.toLowerCase();

            // If it's a markdown file, convert to HTML for display
            if (extension === 'md' || extension === 'markdown') {
                // Check if it already looks like HTML (starts with <) to avoid double conversion
                if (content && !content.trim().startsWith('<')) {
                    contentToSet = (editorInstance.storage as any).markdown?.parser.parse(content) || content;
                }
            }

            const isFileChanged = file.id !== lastFileIdRef.current;

            // Only update from props if:
            // 1. The file has changed (switched documents)
            // 2. The editor is NOT focused (external update while user isn't typing)
            // 3. The content is actually different (avoid no-op updates)
            if (isFileChanged || !editorInstance.isFocused) {
                if (contentToSet !== editorInstance.getHTML()) {
                    // Save cursor position if we must update while focused (edge case for verify updates)
                    // But generally we rely on isFocused check.
                    editorInstance.commands.setContent(contentToSet);
                }
            }

            lastFileIdRef.current = file.id;
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

            {/* Width Toggle & Editor Controls */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2 no-print">
                <button
                    onClick={() => setIsFullWidth(!isFullWidth)}
                    className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                    title={isFullWidth ? "Switch to focused width" : "Switch to full width"}
                >
                    {isFullWidth ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
            </div>

            {/* Novel Editor */}
            <div className="flex-1 overflow-y-auto relative bg-white">
                <EditorRoot>
                    <EditorToolbar editor={editorInstance} />
                    <EditorContent
                        immediatelyRender={false}
                        extensions={extensions}
                        className={`novel-editor px-8 py-8 md:px-16 lg:px-24 transition-all duration-300 ease-in-out ${isFullWidth ? "max-w-none w-full" : "max-w-3xl mx-auto"
                            }`}
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
                                class: `prose prose-lg focus:outline-none min-h-[500px] font-serif ${isFullWidth ? "max-w-none" : "max-w-3xl mx-auto"}`,
                            },
                        }}
                        onUpdate={({ editor }) => {
                            // Sync Markdown content for the agent/backend
                            const markdown = (editor.storage as any).markdown?.getMarkdown() || editor.getText();
                            onContentChange(markdown);

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
                            // Force initial sync to ensure file on disk is Markdown (converts legacy HTML)
                            const markdown = (editor.storage as any).markdown?.getMarkdown() || editor.getText();
                            onContentChange(markdown);
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
