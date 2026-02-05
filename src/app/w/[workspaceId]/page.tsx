
"use client";

import { Header } from "@/components/Header";
import { FileExplorer } from "@/components/FileExplorer";
import { StatusBar } from "@/components/StatusBar";
import dynamic from "next/dynamic";
import { CommandCenter } from "@/components/CommandCenter";
import { useState, useCallback, useEffect, use, useMemo } from "react";
import type { EditorActions } from "@/components/novel";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildFileTree } from "@/lib/utils/file-tree";
import { createDocument, updateDocumentContent, renameDocument, deleteDocument, moveDocument, importDocument } from "./actions";
import { uploadFile } from "@/lib/storage";
import { TabsManager } from "@/components/TabsManager";
import { useAutosave, type SaveStatus } from "@/lib/hooks/use-autosave";

// Dynamic import with SSR disabled
const NovelEditor = dynamic(() => import("@/components/novel").then(mod => ({ default: mod.NovelEditor })), {
    ssr: false,
    loading: () => (
        <main className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative items-center justify-center">
            <div className="text-[#858585]">Loading editor...</div>
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

// Export helpers
const exportToWord = (html: string, filename: string = 'document') => {
    const blob = new Blob([`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>${html}</body>
</html>
  `], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    a.click();
    URL.revokeObjectURL(url);
};

const exportToHtml = (html: string, filename: string = 'document') => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
};

export default function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = use(params);

    const [files, setFiles] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
    const [openFiles, setOpenFiles] = useState<FileNode[]>([]);
    const [editorContent, setEditorContent] = useState<string>("");
    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);
    const [loading, setLoading] = useState(true);
    const [wordCount, setWordCount] = useState<{ words: number; characters: number }>({ words: 0, characters: 0 });

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
            // Select first file if nothing selected
            if (!selectedFile && tree.length > 0) {
                const firstFile = documents.find(d => d.type === 'file');
                if (firstFile) {
                    // logic to select default could go here
                }
            }
        }
        setLoading(false);
    }, [workspaceId, selectedFile]);

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
            alert("Create failed");
        }
    };

    const handleUpload = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            await importDocument(workspaceId, formData);
            await fetchFiles();
        } catch (e) {
            console.error("Upload failed", e);
            alert("Upload failed.");
        }
    };

    const handleFileSelect = async (file: FileNode) => {
        if (file.type === "file") {
            setSelectedFile(file);
            setEditorContent(file.content || "");

            // Add to open files if not present
            if (!openFiles.find(f => f.id === file.id)) {
                setOpenFiles(prev => [...prev, file]);
            }
        }
    };

    const handleTabClose = (fileId: string) => {
        const newOpenFiles = openFiles.filter(f => f.id !== fileId);
        setOpenFiles(newOpenFiles);

        if (selectedFile?.id === fileId) {
            // If we closed the active file, switch to the last one or null
            const lastFile = newOpenFiles[newOpenFiles.length - 1];
            if (lastFile) {
                setSelectedFile(lastFile);
                setEditorContent(lastFile.content || "");
            } else {
                setSelectedFile(null);
                setEditorContent("");
            }
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
            alert("Rename failed");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDocument(workspaceId, id);
            if (selectedFile?.id === id) {
                setSelectedFile(null);
                setEditorContent("");
            }
            handleTabClose(id);
            await fetchFiles();
        } catch (e) {
            console.error("Delete failed", e);
            alert("Delete failed");
        }
    };

    const handleMove = async (id: string, newParentId: string | null) => {
        try {
            await moveDocument(workspaceId, id, newParentId);
            await fetchFiles();
        } catch (e) {
            console.error("Move failed", e);
            alert("Move failed");
        }
    };

    const filename = selectedFile?.name.replace(/\.[^/.]+$/, "") || "document";

    if (loading) {
        return <div className="bg-[#1e1e1e] h-screen text-white flex items-center justify-center">Loading Workspace...</div>
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                onExportPdf={() => window.print()}
                onExportWord={() => editorActions && exportToWord(editorActions.getHTML(), filename)}
                onExportHtml={() => editorActions && exportToHtml(editorActions.getHTML(), filename)}
                onUndo={() => editorActions?.undo()}
                onRedo={() => editorActions?.redo()}
                onSelectAll={() => editorActions?.selectAll()}
                onClearFormatting={() => editorActions?.clearFormatting()}
                onShowWordCount={() => {
                    if (editorActions) {
                        const { words, characters } = editorActions.getWordCount();
                        alert(`Words: ${words}\nCharacters: ${characters}`);
                    }
                }}
                canUndo={editorActions?.canUndo() || false}
                canRedo={editorActions?.canRedo() || false}
            />
            <div className="flex flex-1 overflow-hidden">
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
                <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
                    <TabsManager
                        openFiles={openFiles}
                        activeFileId={selectedFile?.id || null}
                        onTabSelect={handleFileSelect}
                        onTabClose={handleTabClose}
                    />

                    {selectedFile ? (
                        (() => {
                            let isPdf = false;
                            let pdfUrl = "";
                            try {
                                if (editorContent && editorContent.trim().startsWith('{')) {
                                    const json = JSON.parse(editorContent);
                                    if (json.type === 'pdf' && json.url) {
                                        isPdf = true;
                                        pdfUrl = json.url;
                                    }
                                }
                            } catch (e) { }

                            if (isPdf) {
                                return (
                                    <div className="flex-1 w-full h-full bg-[#1e1e1e]">
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
                                />
                            );
                        })()
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-[#858585]">
                            Select a file to edit
                        </div>
                    )}

                    {/* Status Bar */}
                    {selectedFile && (
                        <StatusBar
                            saveStatus={saveStatus}
                            lastSaved={lastSaved}
                            wordCount={wordCount}
                        />
                    )}
                </div>
                <CommandCenter
                    currentFile={selectedFile}
                    onFileUpdate={handleContentUpdate}
                    files={files}
                    onFilesChange={setFiles}
                />
            </div>
        </div>
    );
}
