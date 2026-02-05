"use client";

import { useState, useRef, useEffect } from "react";
import {
    ChevronRight, Folder, FolderOpen, FileText, Search, Settings,
    FilePlus, FolderPlus, UploadCloud, MoreVertical, Trash2, Edit2, AlertCircle
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

    // New Actions
    onRename?: (id: string, newName: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onMove?: (id: string, newParentId: string | null) => Promise<void>;
}

// --- Icons & Helpers ---
function FileIcon({ file, isOpen }: { file: FileNode; isOpen?: boolean }) {
    if (file.type === "folder") {
        if (isOpen) return <FolderOpen className="w-4 h-4 text-[#dcb67a]" />;
        return <Folder className="w-4 h-4 text-[#dcb67a]" />;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    let colorClass = "text-[#858585]";
    if (ext === "md") colorClass = "text-[#519aba]";
    if (ext === "ts" || ext === "tsx") colorClass = "text-[#519aba]";
    if (ext === "json") colorClass = "text-[#cbcb41]";
    if (ext === "pdf") colorClass = "text-[#d16d6d]";
    return <FileText className={`w-4 h-4 ${colorClass}`} />;
}

// --- File Item Component ---
interface FileTreeItemProps {
    file: FileNode;
    selectedFile: FileNode | null;
    onFileSelect: (file: FileNode) => void;
    depth?: number;

    // Renaming state passed down
    renamingId: string | null;
    onStartRename: (id: string) => void;
    onCommitRename: (id: string, newName: string) => void;
    onCancelRename: () => void;

    // Deletion
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
    const [isOpen, setIsOpen] = useState(file.path === "/Specs"); // Maintain simple default open state
    const isSelected = selectedFile?.id === file.id;
    const hasChildren = file.type === "folder" && file.children && file.children.length > 0;
    const isRenaming = renamingId === file.id;

    // DnD Hooks
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

    // Combine refs: we draggable the item, but if it is a folder, we also drop ON it.
    // For simplicity, we attach droppable to the same div if it's a folder.

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (file.type === "folder") {
            setIsOpen(!isOpen);
        }
        onFileSelect(file);
    };

    // Rename Input Logic
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
                group flex cursor-pointer items-center gap-1 px-2 py-[3px] select-none border border-transparent
                ${isSelected ? "bg-[#094771]" : "hover:bg-[#2a2d2e]"}
                ${isOver && file.type === 'folder' && !isDragging ? "bg-[#2a2d2e] border-[#007fd4]" : ""}
            `}
            onClick={handleClick}
            onContextMenu={(e) => {
                // Select on right click if not already
                if (!isSelected) onFileSelect(file);
            }}
        >
            {/* Indentation */}
            <div style={{ paddingLeft: `${depth * 12}px` }} />

            {file.type === "folder" && (
                <ChevronRight
                    className={`w-4 h-4 text-[#858585] transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}
                />
            )}
            {file.type === "file" && <div className="w-4 flex-shrink-0" />}

            <FileIcon file={file} isOpen={isOpen} />

            {isRenaming ? (
                <input
                    ref={inputRef}
                    defaultValue={file.name}
                    className="bg-[#3c3c3c] text-white text-[13px] px-1 ml-1 outline-none border border-[#007fd4] flex-1 min-w-0"
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => onCommitRename(file.id, inputRef.current?.value || file.name)}
                />
            ) : (
                <span className={`text-[13px] ml-1 truncate ${isSelected ? "text-white" : "text-[#cccccc]"}`}>
                    {file.name}
                </span>
            )}
        </div>
    );

    return (
        <div>
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    {content}
                </ContextMenu.Trigger>
                <ContextMenu.Content className="min-w-[160px] bg-[#252526] rounded-md border border-[#454545] p-[4px] shadow-xl z-50">
                    <ContextMenu.Item
                        className="text-[13px] text-[#cccccc] px-2 py-1.5 rounded cursor-default hover:bg-[#094771] hover:text-white outline-none flex items-center gap-2"
                        onClick={() => onStartRename(file.id)}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        Rename
                    </ContextMenu.Item>
                    <ContextMenu.Item
                        className="text-[13px] text-[#cccccc] px-2 py-1.5 rounded cursor-default hover:bg-[#094771] hover:text-white outline-none flex items-center gap-2"
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

// --- Main Explorer Component ---
export function FileExplorer({
    files, selectedFile, onFileSelect, onCreateNode, onUpload,
    onRename, onDelete, onMove
}: FileExplorerProps) {
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // -- DnD Handlers --
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over || !onMove) return;

        // If dropped on itself
        if (active.id === over.id) return;

        // Check types
        const activeData = active.data.current as { type: string, file: FileNode } | undefined;
        const overData = over.data.current as { type: string, file: FileNode } | undefined;

        if (!activeData || !overData) return;

        // Logic: Drop 'file' OR 'folder' ONTO a 'folder' -> Move inside
        // For now preventing folder-in-folder complexity if needed, but let's allow it (generic file system)
        if (overData.file.type === 'folder') {
            // Avoid circular: dragging folder into its own child (not handled here but backend should check or we check depths)
            // Simple recursive check:
            // if (isChildOf(overData.file, activeData.file)) return; // TODO

            await onMove(active.id as string, over.id as string);
        } else {
            // Dropped on a file? Maybe move to same parent? 
            // dnd-kit collision detection for list reordering is complex without SortableContext.
            // We just support "Move into folder" for now as per plan.
        }
    };

    // -- Action Handlers --
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

    return (
        <aside className="w-[240px] flex-none flex flex-col border-r border-[#3c3c3c] bg-[#252526]">
            {/* Header */}
            <div className="px-4 py-2 border-b border-[#3c3c3c]">
                <div className="flex items-center justify-between">
                    <h1 className="text-[#bbbbbb] text-[11px] font-semibold uppercase tracking-wide">
                        Explorer
                    </h1>
                    <div className="flex gap-1">
                        <div onClick={() => onCreateNode?.('file')} className="cursor-pointer hover:bg-[#3c3c3c] p-1 rounded text-[#cccccc]" title="New File">
                            <FilePlus className="w-4 h-4" />
                        </div>
                        <div onClick={() => onCreateNode?.('folder')} className="cursor-pointer hover:bg-[#3c3c3c] p-1 rounded text-[#cccccc]" title="New Folder">
                            <FolderPlus className="w-4 h-4" />
                        </div>
                        <label className="cursor-pointer hover:bg-[#3c3c3c] p-1 rounded text-[#cccccc]" title="Upload File">
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && onUpload) onUpload(file);
                                    e.target.value = '';
                                }}
                            />
                            <UploadCloud className="w-4 h-4" />
                        </label>
                    </div>
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {files.map((file) => (
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

                    {/* Drag Overlay for Visual Feedback */}
                    <DragOverlay>
                        {activeDragId ? (
                            <div className="px-2 py-1 bg-[#094771] text-white text-[13px] rounded opacity-80 shadow-lg border border-[#007fd4] flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span>Moving...</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
                    <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-[#252526] p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[101] border border-[#454545]">
                        <Dialog.Title className="text-[#cccccc] m-0 text-[17px] font-medium mb-4 flex items-center gap-2">
                            <AlertCircle className="text-red-400 w-5 h-5" />
                            Confirm Deletion
                        </Dialog.Title>
                        <Dialog.Description className="text-[#858585] mt-[10px] mb-5 text-[14px] leading-normal">
                            Are you sure you want to delete <span className="text-white font-mono bg-[#3c3c3c] px-1 rounded">{deleteTarget?.name}</span>? This action cannot be undone.
                        </Dialog.Description>
                        <div className="mt-[25px] flex justify-end gap-[10px]">
                            <Dialog.Close asChild>
                                <button className="bg-[#3c3c3c] text-[#cccccc] hover:bg-[#454545] focus:shadow-slate-700 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <Dialog.Close asChild>
                                <button
                                    onClick={() => deleteTarget && onDelete && onDelete(deleteTarget.id)}
                                    className="bg-red-900/50 text-red-200 hover:bg-red-900/70 focus:shadow-red-900 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none focus:shadow-[0_0_0_2px] focus:outline-none border border-red-900"
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
