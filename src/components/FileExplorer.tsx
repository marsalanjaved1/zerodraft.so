"use client";

import { useState, useRef, useEffect } from "react";
import {
    ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Search, Settings,
    FilePlus, FolderPlus, UploadCloud, Trash2, Edit2, Plus
} from "lucide-react";
import type { FileNode } from "@/lib/types";
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragEndEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent
} from "@dnd-kit/core";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as Dialog from "@radix-ui/react-dialog";

interface FileExplorerProps {
    files: FileNode[];
    selectedFile: FileNode | null;
    onFileSelect: (file: FileNode) => void;
    onCreateNode?: (type: 'file' | 'folder', parentId?: string) => void;
    onUpload?: (file: File) => void;
    onRename?: (id: string, newName: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onMove?: (id: string, newParentId: string | null) => Promise<void>;
    workspaceName?: string;
    onRenameWorkspace?: (newName: string) => Promise<void>;
    onWorkspaceSwitch?: () => void;
}

// File icon based on type
function FileIcon({ file, isOpen }: { file: FileNode; isOpen?: boolean }) {
    if (file.type === "folder") {
        if (isOpen) return <FolderOpen className="w-4 h-4 text-gray-500" />;
        return <Folder className="w-4 h-4 text-gray-400" />;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    let colorClass = "text-gray-400";
    if (ext === "md") colorClass = "text-blue-500";
    if (ext === "ts" || ext === "tsx") colorClass = "text-blue-500";
    if (ext === "json") colorClass = "text-yellow-500";
    if (ext === "pdf") colorClass = "text-red-500";
    return <FileText className={`w-4 h-4 ${colorClass}`} />;
}

// File tree item component
// File tree item component
interface FileTreeItemProps {
    file: FileNode;
    selectedFile: FileNode | null;
    onFileSelect: (file: FileNode) => void;
    depth?: number;
    renamingId: string | null;
    onStartRename: (id: string) => void;
    onCommitRename: (id: string, newName: string) => void;
    onCancelRename: () => void;
    onDeleteRequest: (file: FileNode) => void;
    allFiles: FileNode[]; // Needed for duplicate check
    onCreateNode?: (type: 'file' | 'folder', parentId?: string) => void;
}

function FileTreeItem({
    file,
    selectedFile,
    onFileSelect,
    depth = 0,
    renamingId,
    onStartRename,
    onCommitRename,
    onCancelRename,
    onDeleteRequest,
    allFiles,
    onCreateNode
}: FileTreeItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedFile?.id === file.id;
    const hasChildren = file.type === "folder" && file.children && file.children.length > 0;
    const isRenaming = renamingId === file.id;
    const [fileNameInput, setFileNameInput] = useState(file.name);
    const [error, setError] = useState<string | null>(null);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: file.id,
        data: { type: file.type, file }
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: file.id,
        data: { type: file.type, file },
        disabled: file.type !== 'folder'
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.6 : 1,
        scale: isDragging ? 1.05 : 1,
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (file.type === "folder" && !isRenaming) {
            setIsOpen(!isOpen);
        }
        onFileSelect(file);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartRename(file.id);
    };

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isRenaming) {
            setFileNameInput(file.name);
            setError(null);
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }
    }, [isRenaming, file.name]);

    const validateAndCommit = () => {
        const newName = fileNameInput.trim();
        if (!newName || newName === file.name) {
            onCancelRename();
            return;
        }

        // Check for duplicates in same folder
        // For simplicity in this recursive structure, we look at the parent's children if we knew current parent
        // But here we might need to rely on the parent executing the check, OR we do a quick check if 'allFiles' represents the current level.
        // Actually, 'allFiles' passed here is likely the whole tree or the current list being mapped. 
        // Let's assume 'allFiles' is the list of siblings at this level.
        const isDuplicate = allFiles.some(f => f.id !== file.id && f.name.toLowerCase() === newName.toLowerCase());

        if (isDuplicate) {
            setError("Name already exists");
            return;
        }

        onCommitRename(file.id, newName);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            validateAndCommit();
        } else if (e.key === "Escape") {
            onCancelRename();
        }
    };

    const content = (
        <div
            ref={(node) => {
                setNodeRef(node);
                if (file.type === 'folder') setDroppableRef(node);
            }}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                group flex cursor-pointer items-center gap-2 px-2 py-1.5 rounded-md mx-1.5 transition-all select-none
                ${isSelected
                    ? "bg-white shadow-subtle border border-gray-200/60 text-gray-900 font-medium"
                    : "text-gray-500 hover:bg-white hover:shadow-subtle"
                }
                ${isOver && file.type === 'folder' && !isDragging ? "ring-2 ring-indigo-500 ring-inset bg-indigo-50" : ""}
                ${isDragging ? "shadow-lg ring-1 ring-gray-200 rotate-2" : ""}
            `}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* Indentation */}
            <div style={{ paddingLeft: `${depth * 12}px` }} />

            {file.type === "folder" && (
                isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}

            <FileIcon file={file} isOpen={isOpen} />

            {isRenaming ? (
                <div className="flex-1 min-w-0 relative">
                    <input
                        ref={inputRef}
                        value={fileNameInput}
                        onChange={(e) => {
                            setFileNameInput(e.target.value);
                            setError(null);
                        }}
                        className={`bg-white text-gray-900 text-[13px] px-1 outline-none border rounded w-full ${error ? "border-red-500" : "border-indigo-500"}`}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={validateAndCommit}
                    />
                    {error && (
                        <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg z-[60] whitespace-nowrap">
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <span className="text-[13px] truncate flex-1">{file.name}</span>
            )}
        </div>
    );

    return (
        <div>
            <ContextMenu.Root>
                <ContextMenu.Trigger>{content}</ContextMenu.Trigger>
                <ContextMenu.Content className="min-w-[140px] bg-white rounded-lg border border-gray-200 p-1 shadow-float z-50">
                    {file.type === 'folder' && (
                        <>
                            <ContextMenu.Item
                                className="text-[13px] text-gray-700 px-2 py-1.5 rounded cursor-default hover:bg-gray-50 outline-none flex items-center gap-2"
                                onClick={() => {
                                    setIsOpen(true);
                                    onCreateNode?.('file', file.id);
                                }}
                            >
                                <FilePlus className="w-3.5 h-3.5" />
                                New File
                            </ContextMenu.Item>
                            <ContextMenu.Item
                                className="text-[13px] text-gray-700 px-2 py-1.5 rounded cursor-default hover:bg-gray-50 outline-none flex items-center gap-2"
                                onClick={() => {
                                    setIsOpen(true);
                                    onCreateNode?.('folder', file.id);
                                }}
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                                New Folder
                            </ContextMenu.Item>
                            <ContextMenu.Separator className="h-[1px] bg-gray-100 my-1" />
                        </>
                    )}
                    <ContextMenu.Item
                        className="text-[13px] text-gray-700 px-2 py-1.5 rounded cursor-default hover:bg-gray-50 outline-none flex items-center gap-2"
                        onClick={() => onStartRename(file.id)}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        Rename
                    </ContextMenu.Item>
                    <ContextMenu.Item
                        className="text-[13px] text-red-600 px-2 py-1.5 rounded cursor-default hover:bg-red-50 outline-none flex items-center gap-2"
                        onClick={() => onDeleteRequest(file)}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Root>

            {isOpen && hasChildren && (
                <div>
                    {file.children!.map((child) => (
                        <FileTreeItem
                            key={child.id}
                            file={child}
                            selectedFile={selectedFile}
                            onFileSelect={onFileSelect}
                            depth={depth + 1}
                            renamingId={renamingId}
                            onStartRename={onStartRename}
                            onCommitRename={onCommitRename}
                            onCancelRename={onCancelRename}
                            onDeleteRequest={onDeleteRequest}
                            allFiles={file.children!}
                            onCreateNode={onCreateNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FileExplorer({
    files, selectedFile, onFileSelect, onCreateNode, onUpload,
    onRename, onDelete, onMove, workspaceName = "Workspace", onRenameWorkspace
}: FileExplorerProps) {
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
    const [workspaceNameInput, setWorkspaceNameInput] = useState(workspaceName);

    useEffect(() => {
        setWorkspaceNameInput(workspaceName);
    }, [workspaceName]);

    const handleWorkspaceRenameSubmit = async () => {
        if (workspaceNameInput.trim() && workspaceNameInput !== workspaceName && onRenameWorkspace) {
            await onRenameWorkspace(workspaceNameInput);
        }
        setIsEditingWorkspace(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpload) {
            onUpload(file);
        }
        // Reset input so same file can be uploaded again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over || !onMove || active.id === over.id) return;

        const overData = over.data.current as { type: string, file: FileNode } | undefined;
        if (overData?.file.type === 'folder') {
            await onMove(active.id as string, over.id as string);
        }
    };

    const handleStartRename = (id: string) => setRenamingId(id);
    const handleCancelRename = () => setRenamingId(null);
    const handleCommitRename = async (id: string, newName: string) => {
        if (!newName.trim() || !onRename) {
            setRenamingId(null);
            return;
        }
        await onRename(id, newName);
        setRenamingId(null);
    };

    // Filter files based on search
    const filteredFiles = searchQuery
        ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : files;

    // Separate documents and research notes (placeholder logic)
    const documents = filteredFiles.filter(f => f.type === 'file');
    const folders = filteredFiles.filter(f => f.type === 'folder');

    const activeDragItem = activeDragId ? files.find(f => f.id === activeDragId) || files.flatMap(f => f.children || []).find(f => f.id === activeDragId) : null;

    return (
        <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-none hidden md:flex">
            {/* Workspace Switcher */}
            <div className="p-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white transition-all shadow-none hover:shadow-subtle text-sm font-medium text-gray-700 max-w-[160px]">
                        <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-[10px] font-bold flex-shrink-0">
                            {workspaceName.charAt(0)}
                        </div>
                        {isEditingWorkspace ? (
                            <input
                                autoFocus
                                type="text"
                                value={workspaceNameInput}
                                onChange={(e) => setWorkspaceNameInput(e.target.value)}
                                onBlur={handleWorkspaceRenameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleWorkspaceRenameSubmit();
                                    if (e.key === 'Escape') {
                                        setWorkspaceNameInput(workspaceName);
                                        setIsEditingWorkspace(false);
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white text-gray-900 text-sm px-1 py-0 outline-none border border-indigo-500 rounded w-full min-w-0"
                            />
                        ) : (
                            <span
                                onDoubleClick={() => onRenameWorkspace && setIsEditingWorkspace(true)}
                                className={onRenameWorkspace ? "cursor-text truncate" : "truncate"}
                                title={onRenameWorkspace ? "Double click to rename" : undefined}
                            >
                                {workspaceName}
                            </span>
                        )}
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onCreateNode?.('file')}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-md transition-all"
                            title="New File"
                        >
                            <FilePlus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onCreateNode?.('folder')}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-md transition-all"
                            title="New Folder"
                        >
                            <FolderPlus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-3">
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600" />
                    <input
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-gray-300 focus:border-gray-300 placeholder:text-gray-400 transition-shadow shadow-sm"
                        placeholder="Find..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* File Tree */}
            <nav className="flex-1 overflow-y-auto px-1 py-2 space-y-6">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {/* Unified Files Section */}
                    <div>
                        <div className="px-3 mb-1.5 flex items-center justify-between group">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Files
                            </span>
                            <div className="flex items-center gap-1">
                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx,.doc,.txt,.md"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-gray-400 hover:text-gray-700 transition-opacity"
                                    title="Upload file"
                                >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onCreateNode?.('folder')}
                                    className="text-gray-400 hover:text-gray-700 transition-opacity"
                                    title="New Folder"
                                >
                                    <FolderPlus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onCreateNode?.('file')}
                                    className="text-gray-400 hover:text-gray-700 transition-opacity"
                                    title="New File"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {filteredFiles.map((file) => (
                            <FileTreeItem
                                key={file.id}
                                file={file}
                                selectedFile={selectedFile}
                                onFileSelect={onFileSelect}
                                renamingId={renamingId}
                                onStartRename={handleStartRename}
                                onCommitRename={handleCommitRename}
                                onCancelRename={handleCancelRename}
                                onDeleteRequest={setDeleteTarget}
                                allFiles={filteredFiles}
                                onCreateNode={onCreateNode}
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeDragItem ? (
                            <div className="px-3 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg shadow-float border border-gray-200/80 flex items-center gap-2 opacity-90 rotate-2 cursor-grabbing w-48">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span className="truncate">{activeDragItem.name}</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </nav>

            {/* Settings */}
            <div className="p-3 border-t border-gray-100">
                <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 transition-colors w-full px-2 py-1">
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/30 z-[100]" />
                    <Dialog.Content className="fixed top-[50%] left-[50%] max-w-[380px] w-[90vw] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-float focus:outline-none z-[101]">
                        <Dialog.Title className="text-gray-900 text-base font-semibold mb-2">
                            Delete {deleteTarget?.name}?
                        </Dialog.Title>
                        <Dialog.Description className="text-gray-500 text-sm mb-6">
                            This action cannot be undone.
                        </Dialog.Description>
                        <div className="flex justify-end gap-3">
                            <Dialog.Close asChild>
                                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <Dialog.Close asChild>
                                <button
                                    onClick={() => deleteTarget && onDelete?.(deleteTarget.id)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </Dialog.Close>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </aside>
    );
}
