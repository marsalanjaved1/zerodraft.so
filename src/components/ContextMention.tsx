"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, X, AtSign } from "lucide-react";
import type { FileNode } from "@/lib/types";

interface ContextMentionProps {
    files: FileNode[];
    isOpen: boolean;
    onSelect: (file: FileNode) => void;
    onClose: () => void;
    position?: { top: number; left: number };
    searchQuery?: string;
}

// Flatten file tree to get all files (not folders)
function flattenFiles(nodes: FileNode[]): FileNode[] {
    const result: FileNode[] = [];
    for (const node of nodes) {
        if (node.type === "file") {
            result.push(node);
        }
        if (node.children) {
            result.push(...flattenFiles(node.children));
        }
    }
    return result;
}

export function ContextMentionDropdown({
    files,
    isOpen,
    onSelect,
    onClose,
    searchQuery = ""
}: ContextMentionProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const allFiles = flattenFiles(files);
    const filteredFiles = searchQuery
        ? allFiles.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : allFiles;

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredFiles.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
            } else if (e.key === "Enter" && filteredFiles[selectedIndex]) {
                e.preventDefault();
                onSelect(filteredFiles[selectedIndex]);
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filteredFiles, selectedIndex, onSelect, onClose]);

    if (!isOpen || filteredFiles.length === 0) return null;

    return (
        <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50"
        >
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-500 flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                Add file as context
            </div>
            <div className="py-1">
                {filteredFiles.map((file, index) => (
                    <button
                        key={file.id}
                        onClick={() => onSelect(file)}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm ${index === selectedIndex
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// File chip component for selected context files
interface ContextChipProps {
    file: FileNode;
    onRemove: () => void;
}

export function ContextChip({ file, onRemove }: ContextChipProps) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
            <FileText className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{file.name}</span>
            <button
                onClick={onRemove}
                className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                title="Remove context"
            >
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}
