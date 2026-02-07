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
    onCreateNode?: (type: 'file' | 'folder') => void;
    onUpload?: (file: File) => void;
    onRename?: (id: string, newName: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onMove?: (id: string, newParentId: string | null) => Promise<void>;
    workspaceName?: string;
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
    onDeleteRequest
}: FileTreeItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedFile?.id === file.id;
    const hasChildren = file.type === "folder" && file.children && file.children.length > 0;
    const isRenaming = renamingId === file.id;

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
        opacity: isDragging ? 0.5 : 1
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (file.type === "folder") {
            setIsOpen(!isOpen);
        }
        onFileSelect(file);
    };

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            onCommitRename(file.id, inputRef.current?.value || file.name);
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
                group flex cursor-pointer items-center gap-2 px-2 py-1.5 rounded-md mx-1.5 transition-all
                ${isSelected
                    ? "bg-white shadow-subtle border border-gray-200/60 text-gray-900 font-medium"
                    : "text-gray-500 hover:bg-white hover:shadow-subtle"
                }
                ${isOver && file.type === 'folder' && !isDragging ? "ring-2 ring-indigo-500 ring-inset" : ""}
            `}
            onClick={handleClick}
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
                <input
                    ref={inputRef}
                    defaultValue={file.name}
                    className="bg-white text-gray-900 text-[13px] px-1 outline-none border border-indigo-500 rounded flex-1 min-w-0"
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => onCommitRename(file.id, inputRef.current?.value || file.name)}
                />
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FileExplorer({
    files, selectedFile, onFileSelect, onCreateNode, onUpload,
    onRename, onDelete, onMove, workspaceName = "Marketing Team"
}: FileExplorerProps) {
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    return (
        <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-none hidden md:flex">
            {/* Workspace Switcher */}
            <div className="p-3 border-b border-gray-100">
                <button className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white transition-all shadow-none hover:shadow-subtle text-sm font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-[10px] font-bold">
                            {workspaceName.charAt(0)}
                        </span>
                        <span>{workspaceName}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
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
                {/* Documents Section */}
                <div>
                    <div className="px-3 mb-1.5 flex items-center justify-between group">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Documents
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
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity"
                                title="Upload file"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onCreateNode?.('file')}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity"
                                title="New document"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {documents.map((file) => (
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
                            />
                        ))}
                        <DragOverlay>
                            {activeDragId ? (
                                <div className="px-2 py-1 bg-white text-gray-900 text-[13px] rounded shadow-float border border-gray-200 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>Moving...</span>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>

                {/* Folders/Research Notes Section */}
                {folders.length > 0 && (
                    <div>
                        <div className="px-3 mb-1.5 flex items-center justify-between group">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Research Notes
                            </span>
                            <button
                                onClick={() => onCreateNode?.('folder')}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {folders.map((file) => (
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
                            />
                        ))}
                    </div>
                )}
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
