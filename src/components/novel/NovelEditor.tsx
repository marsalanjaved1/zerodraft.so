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
    applySuggestChange: (searchText: string, replacementText: string, changeId: string) => boolean | string;
}

interface NovelEditorProps {
    file: FileNode | null;
    content: string;
    onContentChange: (content: string) => void;
    onEditorReady?: (actions: EditorActions) => void;
    onFileImport?: (name: string, content: string) => void;
    enableGhostText?: boolean;
    ghostTextModel?: string;
}

export function NovelEditor({
    file,
    content,
    onContentChange,
    onEditorReady,
    onFileImport,
    enableGhostText = false,
    ghostTextModel = "anthropic/claude-haiku-4.5",
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



    // ─── Text-search-based suggest change ───────────────────────────────────
    // Finds `searchText` in the ProseMirror document, applies deletion marks to it,
    // then inserts `replacementText` with insertion marks right after.
    const applySuggestChange = useCallback((searchText: string, replacementText: string, changeId: string): boolean | string => {
        if (!editorInstance) {
            return "FILE_NOT_OPEN: No document is open. Open the document first.";
        }

        const { doc, schema, tr } = editorInstance.state;
        const deletionMark = schema.marks.suggestDeletion;
        const insertionMark = schema.marks.suggestInsertion;

        if (!deletionMark || !insertionMark) {
            return "EXTENSION_MISSING: Suggest change marks not registered.";
        }

        // Pure insertion (no text to replace)
        if (!searchText || searchText.trim() === "") {
            // Insert at the end of the document
            const endPos = doc.content.size;
            const insertMark = insertionMark.create({ changeId });
            const textNode = schema.text(replacementText, [insertMark]);
            const insertTr = tr.insert(endPos - 1, textNode);
            editorInstance.view.dispatch(insertTr);
            return true;
        }

        // Normalize search text for matching
        const normalizeForSearch = (s: string) => s.replace(/\s+/g, ' ').trim();
        const normalizedSearch = normalizeForSearch(searchText);

        // Search through the document for the text
        let matchFrom: number | null = null;
        let matchTo: number | null = null;

        // Walk all text content and try to find the search text
        const docText = doc.textContent;
        const normalizedDoc = normalizeForSearch(docText);
        const searchIdx = normalizedDoc.indexOf(normalizedSearch);

        if (searchIdx === -1) {
            // Try a more lenient fuzzy match — look for a substring match
            const words = normalizedSearch.split(' ').filter(w => w.length > 3);
            if (words.length > 0) {
                // Try matching using the first and last few words as anchors
                const firstWords = words.slice(0, Math.min(3, words.length)).join(' ');
                const altIdx = normalizedDoc.indexOf(firstWords);
                if (altIdx === -1) {
                    return `NOT_FOUND: Could not find the text "${searchText.slice(0, 80)}..." in the document. Please re-read the document and use the exact text.`;
                }
                // Partial match found - use it but warn
            } else {
                return `NOT_FOUND: Could not find the text "${searchText.slice(0, 80)}..." in the document. Please re-read the document and use the exact text.`;
            }
        }

        // Map normalized character offset back to ProseMirror positions
        // We need to walk the doc node by node, tracking text offsets
        let charOffset = 0;
        let foundFrom: number | null = null;
        let foundTo: number | null = null;
        const targetStart = searchIdx;
        const targetEnd = searchIdx + normalizedSearch.length;

        doc.descendants((node, pos) => {
            if (foundFrom !== null && foundTo !== null) return false;
            if (!node.isText) return;

            const nodeText = node.textContent;
            const nodeNormalized = normalizeForSearch(nodeText);

            for (let i = 0; i < nodeNormalized.length; i++) {
                const globalCharIdx = charOffset + i;

                if (globalCharIdx === targetStart && foundFrom === null) {
                    // Map back to the position in this text node
                    // We need to find the actual character position, accounting for whitespace normalization
                    let origCharCount = 0;
                    let normCharCount = 0;
                    for (let j = 0; j < nodeText.length; j++) {
                        if (/\s/.test(nodeText[j])) {
                            if (j === 0 || /\s/.test(nodeText[j - 1])) continue;
                        }
                        if (normCharCount === i) {
                            foundFrom = pos + j;
                            break;
                        }
                        normCharCount++;
                    }
                    if (foundFrom === null) foundFrom = pos;
                }

                if (globalCharIdx === targetEnd - 1 && foundFrom !== null) {
                    let origCharCount = 0;
                    let normCharCount = 0;
                    for (let j = 0; j < nodeText.length; j++) {
                        if (/\s/.test(nodeText[j])) {
                            if (j === 0 || /\s/.test(nodeText[j - 1])) continue;
                        }
                        if (normCharCount === i) {
                            foundTo = pos + j + 1;
                            break;
                        }
                        normCharCount++;
                    }
                    if (foundTo === null) foundTo = pos + nodeText.length;
                }
            }

            charOffset += nodeNormalized.length;
        });

        // Fallback: simpler position mapping if the above didn't work well
        if (foundFrom === null || foundTo === null) {
            // Simple approach: walk through text nodes, build up plain text, find offset
            let plainOffset = 0;
            const ranges: { pos: number; length: number; offset: number }[] = [];

            doc.descendants((node, pos) => {
                if (node.isText) {
                    ranges.push({ pos, length: node.nodeSize, offset: plainOffset });
                    plainOffset += node.textContent.length;
                } else if (node.isBlock && ranges.length > 0) {
                    plainOffset += 1; // account for block separator
                }
            });

            // Find the search text in plain text
            const plainText = doc.textBetween(0, doc.content.size, ' ');
            const plainNorm = normalizeForSearch(plainText);
            const plainIdx = plainNorm.indexOf(normalizedSearch);

            if (plainIdx !== -1) {
                // Map plain text offset to PM position
                let accumulated = 0;
                for (const range of ranges) {
                    const rangeText = normalizeForSearch(doc.textBetween(range.pos, range.pos + range.length));
                    if (accumulated + rangeText.length > plainIdx && foundFrom === null) {
                        const localOffset = plainIdx - accumulated;
                        foundFrom = range.pos + localOffset;
                    }
                    if (accumulated + rangeText.length >= plainIdx + normalizedSearch.length && foundTo === null) {
                        const localOffset = plainIdx + normalizedSearch.length - accumulated;
                        foundTo = range.pos + Math.min(localOffset, range.length);
                    }
                    accumulated += rangeText.length;
                    if (foundFrom !== null && foundTo !== null) break;
                }
            }
        }

        if (foundFrom === null || foundTo === null) {
            // Fallback: Check if the text exists in the Markdown representation
            // This handles cases where the agent searches for Markdown syntax (e.g. "## Header", "---")
            // which doesn't exist in the ProseMirror textContent (where it's structural).
            const markdown = (editorInstance.storage as any).markdown?.getMarkdown();
            if (markdown) {
                const normalizedMd = normalizeForSearch(markdown);
                if (normalizedMd.includes(normalizedSearch)) {
                    // It exists in Markdown! We can't easily apply suggest marks to syntax,
                    // so we fall back to a direct replacement of the content.
                    const newMarkdown = markdown.replace(
                        // Escape regex special chars in searchText but convert normalized spaces to \s+
                        new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+').trim(), 'u'),
                        replacementText
                    );

                    if (newMarkdown !== markdown) {
                        try {
                            editorInstance.commands.setContent(newMarkdown);
                            return true;
                        } catch (e) {
                            return `Edit failed during Markdown fallback: ${(e as any).message}`;
                        }
                    }
                }
            }

            return `NOT_FOUND: Could not locate the text in the document. The text may have changed.`;
        }

        // Clamp positions to valid range
        foundFrom = Math.max(0, foundFrom);
        foundTo = Math.min(doc.content.size, foundTo);

        try {
            // Apply deletion mark to the original text
            const delMark = deletionMark.create({ changeId });
            let newTr = editorInstance.state.tr;
            newTr = newTr.addMark(foundFrom, foundTo, delMark);

            // Insert new text with insertion mark right after
            if (replacementText && replacementText.trim() !== "") {
                const insMark = insertionMark.create({ changeId });
                const newTextNode = schema.text(replacementText, [insMark]);
                newTr = newTr.insert(foundTo, newTextNode);
            }

            editorInstance.view.dispatch(newTr);
            return true;
        } catch (error: any) {
            return `Edit failed: ${error.message}`;
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
                    const html = (editorInstance.storage as any).markdown?.parser.parse(text) || text;
                    editorInstance.chain().focus().insertContent(html).run();
                },
                applySuggestChange,
            };
            onEditorReady(actions);
        }
    }, [editorInstance, onEditorReady, applySuggestChange]);

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
