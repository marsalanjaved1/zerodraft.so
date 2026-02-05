
import { X, FileText } from "lucide-react";
import type { FileNode } from "@/lib/types";

interface TabsManagerProps {
    openFiles: FileNode[];
    activeFileId: string | null;
    onTabSelect: (file: FileNode) => void;
    onTabClose: (fileId: string) => void;
}

export function TabsManager({ openFiles, activeFileId, onTabSelect, onTabClose }: TabsManagerProps) {
    if (openFiles.length === 0) return null;

    return (
        <div className="flex bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto no-scrollbar">
            {openFiles.map((file) => {
                const isActive = file.id === activeFileId;
                return (
                    <div
                        key={file.id}
                        className={`
                            group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] border-r border-[#3c3c3c] cursor-pointer text-sm select-none
                            ${isActive ? "bg-[#1e1e1e] text-white border-t border-t-[#007fd4]" : "bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e]"}
                        `}
                        onClick={() => onTabSelect(file)}
                    >
                        <FileText className={`w-4 h-4 ${isActive ? "text-[#519aba]" : "text-[#858585]"}`} />
                        <span className="truncate flex-1">{file.name}</span>
                        <div
                            className={`p-0.5 rounded-sm hover:bg-[#4b4b4b] ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(file.id);
                            }}
                        >
                            <X className="w-3 h-3" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
