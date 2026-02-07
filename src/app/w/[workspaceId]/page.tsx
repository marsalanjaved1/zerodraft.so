
"use client";

import { Header } from "@/components/Header";
import { FileExplorer } from "@/components/FileExplorer";
import { StatusBar } from "@/components/StatusBar";
import { FocusMode } from "@/components/FocusMode";
import { AgentPanel } from "@/components/AgentPanel";
import { exportToWord, exportToHtml, exportToMarkdown, exportToPlainText, exportToPdf } from "@/components/ExportDialog";
import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, use, useMemo, useRef } from "react";
import type { EditorActions } from "@/components/novel";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildFileTree } from "@/lib/utils/file-tree";
import { createDocument, updateDocumentContent, renameDocument, deleteDocument, moveDocument, importDocument } from "./actions";
import { uploadFile } from "@/lib/storage";
import { useAutosave, type SaveStatus } from "@/lib/hooks/use-autosave";

// Dynamic import with SSR disabled
const NovelEditor = dynamic(() => import("@/components/novel").then(mod => ({ default: mod.NovelEditor })), {
    ssr: false,
    loading: () => (
        <main className="flex-1 flex flex-col bg-white overflow-hidden relative items-center justify-center">
            <div className="text-gray-400">Loading editor...</div>
        </main>
    ),
});

export interface FileNode {
    id: string;
    name: string;
    path: string;
    type: "file" | "folder";
    children?: FileNode[];
    content?: string;
}

export default function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = use(params);

    const [files, setFiles] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
    const [editorContent, setEditorContent] = useState<string>("");
    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);
    const editorActionsRef = useRef<EditorActions | null>(null);
    const [loading, setLoading] = useState(true);
    const [wordCount, setWordCount] = useState<{ words: number; characters: number }>({ words: 0, characters: 0 });
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [uploadStatus, setUploadStatus] = useState<{ uploading: boolean; message: string }>({ uploading: false, message: '' });

    // Keep ref in sync with state
    useEffect(() => {
        editorActionsRef.current = editorActions;
    }, [editorActions]);

    // Autosave hook
    const { status: saveStatus, lastSaved, updateContent: triggerAutosave, saveNow, hasUnsavedChanges } = useAutosave({
        delay: 2000,
        onSave: async (content: string) => {
            if (selectedFile) {
                await updateDocumentContent(selectedFile.id, content);
            }
        },
    });

    // Keyboard shortcuts (Cmd+S to save)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveNow();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveNow]);

    const fetchFiles = useCallback(async () => {
        const supabase = createClient();
        const { data: documents } = await supabase
            .from("documents")
            .select("id, title, type, parent_id, content")
            .eq("workspace_id", workspaceId);

        if (documents) {
            const tree = buildFileTree(documents);
            setFiles(tree);
        }
        setLoading(false);
    }, [workspaceId]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // -- Handlers --

    const handleCreateNode = async (type: 'file' | 'folder') => {
        try {
            await createDocument(workspaceId, null, type);
            await fetchFiles();
        } catch (e) {
            console.error("Create failed", e);
        }
    };

    const handleUpload = async (file: File) => {
        const isPdf = file.type === 'application/pdf';
        try {
            if (isPdf) {
                setUploadStatus({ uploading: true, message: 'Uploading and extracting text from PDF...' });
            } else {
                setUploadStatus({ uploading: true, message: 'Uploading file...' });
            }
            const formData = new FormData();
            formData.append("file", file);
            await importDocument(workspaceId, formData);
            await fetchFiles();
            setUploadStatus({ uploading: false, message: '' });
        } catch (e) {
            console.error("Upload failed", e);
            setUploadStatus({ uploading: false, message: '' });
        }
    };

    const handleFileSelect = async (file: FileNode) => {
        if (file.type === "file") {
            setSelectedFile(file);
            setEditorContent(file.content || "");
        }
    };

    const handleContentUpdate = useCallback((content: string) => {
        setEditorContent(content);
        triggerAutosave(content);

        // Update word count
        if (editorActions) {
            setWordCount(editorActions.getWordCount());
        }
    }, [triggerAutosave, editorActions]);

    const handleEditorReady = useCallback((actions: EditorActions) => {
        setEditorActions(actions);
    }, []);

    const handleRename = async (id: string, newName: string) => {
        try {
            await renameDocument(workspaceId, id, newName);
            await fetchFiles();
        } catch (e) {
            console.error("Rename failed", e);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDocument(workspaceId, id);
            if (selectedFile?.id === id) {
                setSelectedFile(null);
                setEditorContent("");
            }
            await fetchFiles();
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const handleMove = async (id: string, newParentId: string | null) => {
        try {
            await moveDocument(workspaceId, id, newParentId);
            await fetchFiles();
        } catch (e) {
            console.error("Move failed", e);
        }
    };

    const handleInsertText = useCallback((text: string) => {
        if (editorActions) {
            editorActions.insertText(text);
        }
    }, [editorActions]);

    const handleReplaceSelection = useCallback((text: string) => {
        if (editorActions) {
            // For now, just insert at cursor - in Phase 7 we'll implement proper selection replacement
            editorActions.insertText(text);
        }
    }, [editorActions]);

    const handleSuggestEdit = useCallback((change: { id: string; original: string; suggested: string; reason?: string }) => {
        const actions = editorActionsRef.current;
        console.log("[handleSuggestEdit] Called with:", change);
        console.log("[handleSuggestEdit] editorActionsRef.current:", actions);
        // Apply inline tracked change in editor
        if (actions) {
            console.log("[handleSuggestEdit] Calling applyInlineChange...");
            const applied = actions.applyInlineChange(change.original, change.suggested, change.id);
            console.log("[handleSuggestEdit] Applied:", applied);
            if (!applied) {
                console.warn("Could not find original text in document:", change.original);
            }
        } else {
            console.warn("[handleSuggestEdit] No editorActions available!");
        }
    }, []); // No dependencies - uses ref for current value

    if (loading) {
        return (
            <div className="bg-white h-screen text-gray-500 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading workspace...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white">
            <Header
                workspaceName="Projects"
                projectName="Marketing Team"
                documentTitle={selectedFile?.name || "Untitled Document"}
                isSaved={saveStatus === 'saved' || saveStatus === 'idle'}
                onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Upload Progress Toast */}
            {uploadStatus.uploading && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{uploadStatus.message}</span>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                {isSidebarOpen && (
                    <FileExplorer
                        files={files}
                        selectedFile={selectedFile}
                        onFileSelect={handleFileSelect}
                        onCreateNode={handleCreateNode}
                        onUpload={handleUpload}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onMove={handleMove}
                    />
                )}

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {selectedFile ? (
                        (() => {
                            let pdfUrl = "";
                            try {
                                if (editorContent && editorContent.trim().startsWith('{')) {
                                    const json = JSON.parse(editorContent);
                                    if (json.type === 'pdf' && json.url) {
                                        pdfUrl = json.url;
                                    }
                                }
                            } catch (e) { }

                            // Always show PDF viewer for PDF files (AI gets extracted text separately)
                            if (pdfUrl) {
                                return (
                                    <div className="flex-1 w-full h-full bg-gray-50">
                                        <iframe
                                            src={pdfUrl}
                                            className="w-full h-full border-none"
                                            title={selectedFile.name}
                                        />
                                    </div>
                                );
                            }

                            return (
                                <NovelEditor
                                    file={selectedFile}
                                    content={editorContent}
                                    onContentChange={handleContentUpdate}
                                    onEditorReady={handleEditorReady}
                                    enableGhostText={true}
                                />
                            );
                        })()
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="text-center">
                                <p className="text-sm mb-1">Select a document to start editing</p>
                                <p className="text-xs text-gray-300">or create a new one from the sidebar</p>
                            </div>
                        </div>
                    )}

                    {/* Status Bar */}
                    <StatusBar
                        saveStatus={saveStatus}
                        lastSaved={lastSaved}
                        wordCount={wordCount}
                    />
                </div>

                {/* Agent Panel */}
                <AgentPanel
                    isOpen={isAgentPanelOpen}
                    files={files}
                    onFilesChange={setFiles}
                    onInsertText={handleInsertText}
                    onReplaceSelection={handleReplaceSelection}
                    onSuggestEdit={handleSuggestEdit}
                    workspaceId={workspaceId}
                    selectedFile={selectedFile}
                    onRefreshFiles={fetchFiles}
                    onOpenFile={(fileId) => {
                        // Find the file in the tree and select it
                        const findFileById = (nodes: FileNode[]): FileNode | null => {
                            for (const node of nodes) {
                                if (node.id === fileId) return node;
                                if (node.children) {
                                    const found = findFileById(node.children);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };
                        const file = findFileById(files);
                        if (file && file.type === 'file') {
                            handleFileSelect(file);
                        }
                    }}
                />
            </div>

            {/* Focus Mode Overlay */}
            <FocusMode
                isActive={isFocusMode}
                onClose={() => setIsFocusMode(false)}
            >
                {selectedFile && editorContent && (
                    <div
                        className="prose prose-lg max-w-none font-serif"
                        dangerouslySetInnerHTML={{ __html: editorContent }}
                    />
                )}
            </FocusMode>
        </div>
    );
}
