'use client';

import { useState } from 'react';
import {
    History,
    Clock,
    User,
    ChevronRight,
    RotateCcw,
    Eye,
    X,
    FileText
} from 'lucide-react';

// ============ Types ============
export interface DocumentVersion {
    id: string;
    versionNumber: number;
    createdAt: Date;
    userId?: string;
    userName?: string;
    title?: string;
    changeSummary?: string;
    contentPreview?: string;
}

// ============ Version History Panel ============
interface VersionHistoryPanelProps {
    versions: DocumentVersion[];
    currentVersionId?: string;
    isOpen: boolean;
    onClose: () => void;
    onPreview?: (version: DocumentVersion) => void;
    onRestore?: (version: DocumentVersion) => void;
}

export function VersionHistoryPanel({
    versions,
    currentVersionId,
    isOpen,
    onClose,
    onPreview,
    onRestore,
}: VersionHistoryPanelProps) {
    const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    const formatDate = (date: Date) => {
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

        if (isToday) {
            return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        }
        if (isYesterday) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const handleRestore = async (version: DocumentVersion) => {
        if (!onRestore) return;
        setIsRestoring(true);
        try {
            await onRestore(version);
        } finally {
            setIsRestoring(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 bg-[#252526] border-l border-[#3c3c3c] flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#007acc]" />
                    <span className="text-sm text-[#cccccc] font-medium">Version History</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded">
                    <X className="w-4 h-4 text-[#858585]" />
                </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto">
                {versions.length > 0 ? (
                    <div className="py-2">
                        {versions.map((version, index) => {
                            const isCurrentVersion = version.id === currentVersionId || (index === 0 && !currentVersionId);
                            const isSelected = selectedVersion?.id === version.id;

                            return (
                                <div key={version.id} className="relative">
                                    {/* Timeline line */}
                                    {index < versions.length - 1 && (
                                        <div className="absolute left-5 top-8 bottom-0 w-px bg-[#3c3c3c]" />
                                    )}

                                    <button
                                        onClick={() => setSelectedVersion(isSelected ? null : version)}
                                        className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-[#3c3c3c]/50 transition-colors ${isSelected ? 'bg-[#3c3c3c]/80' : ''
                                            }`}
                                    >
                                        {/* Timeline dot */}
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isCurrentVersion
                                                ? 'bg-[#007acc]'
                                                : 'bg-[#3c3c3c] border border-[#858585]'
                                            }`}>
                                            {isCurrentVersion && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[#cccccc]">
                                                    {formatDate(version.createdAt)}
                                                </span>
                                                {isCurrentVersion && (
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-[#007acc]/30 text-[#007acc] rounded">
                                                        Current
                                                    </span>
                                                )}
                                            </div>

                                            {version.userName && (
                                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#858585]">
                                                    <User className="w-3 h-3" />
                                                    {version.userName}
                                                </div>
                                            )}

                                            {version.changeSummary && (
                                                <p className="text-[10px] text-[#858585] mt-1 line-clamp-2">
                                                    {version.changeSummary}
                                                </p>
                                            )}

                                            <ChevronRight
                                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585] transition-transform ${isSelected ? 'rotate-90' : ''
                                                    }`}
                                            />
                                        </div>
                                    </button>

                                    {/* Expanded Actions */}
                                    {isSelected && (
                                        <div className="px-3 pb-3 ml-7 flex gap-2">
                                            <button
                                                onClick={() => onPreview?.(version)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs text-[#cccccc]"
                                            >
                                                <Eye className="w-3 h-3" />
                                                Preview
                                            </button>
                                            {!isCurrentVersion && (
                                                <button
                                                    onClick={() => handleRestore(version)}
                                                    disabled={isRestoring}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007acc] hover:bg-[#1a85dc] rounded text-xs text-white disabled:opacity-50"
                                                >
                                                    <RotateCcw className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
                                                    Restore
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <History className="w-10 h-10 text-[#858585] opacity-30 mb-3" />
                        <p className="text-sm text-[#858585]">No version history</p>
                        <p className="text-xs text-[#6e6e6e] mt-1">Versions are created automatically when you save</p>
                    </div>
                )}
            </div>

            {/* Footer info */}
            <div className="px-4 py-2 border-t border-[#3c3c3c]">
                <p className="text-[10px] text-[#858585]">
                    {versions.length} version{versions.length !== 1 ? 's' : ''} saved
                </p>
            </div>
        </div>
    );
}

// ============ Version History Button (for toolbar) ============
interface VersionHistoryButtonProps {
    onClick: () => void;
    versionCount?: number;
}

export function VersionHistoryButton({ onClick, versionCount = 0 }: VersionHistoryButtonProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[#3c3c3c] rounded text-xs text-[#cccccc] transition-colors"
            title="Version History"
        >
            <History className="w-3.5 h-3.5" />
            {versionCount > 0 && <span className="text-[#858585]">{versionCount}</span>}
        </button>
    );
}

// ============ Version Preview Modal ============
interface VersionPreviewProps {
    version: DocumentVersion | null;
    content?: string;
    isOpen: boolean;
    onClose: () => void;
    onRestore?: () => void;
}

export function VersionPreview({
    version,
    content,
    isOpen,
    onClose,
    onRestore,
}: VersionPreviewProps) {
    if (!isOpen || !version) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
                    <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[#007acc]" />
                        <div>
                            <h2 className="text-[#cccccc] font-medium">
                                Version from {version.createdAt.toLocaleDateString()}
                            </h2>
                            <p className="text-xs text-[#858585]">
                                {version.userName && `by ${version.userName} • `}
                                Version #{version.versionNumber}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded">
                        <X className="w-4 h-4 text-[#858585]" />
                    </button>
                </div>

                {/* Content Preview */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div
                        className="prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: content || version.contentPreview || '' }}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3c3c3c]">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded"
                    >
                        Close
                    </button>
                    {onRestore && (
                        <button
                            onClick={onRestore}
                            className="px-4 py-1.5 text-xs bg-[#007acc] hover:bg-[#1a85dc] text-white rounded flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Restore this version
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
