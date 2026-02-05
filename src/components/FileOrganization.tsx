'use client';

import { useState, useCallback } from 'react';
import { Star, Tag, Clock, FileText, X, Plus, Check } from 'lucide-react';
import type { FileNode } from '@/lib/types';

// ============ Tags Component ============
interface TagBadgeProps {
    tag: string;
    onRemove?: () => void;
    size?: 'sm' | 'md';
}

export function TagBadge({ tag, onRemove, size = 'sm' }: TagBadgeProps) {
    const sizeClasses = size === 'sm'
        ? 'text-[10px] px-1.5 py-0.5'
        : 'text-xs px-2 py-1';

    return (
        <span className={`inline-flex items-center gap-1 bg-[#3c3c3c] text-[#cccccc] rounded ${sizeClasses}`}>
            <Tag className="w-2.5 h-2.5 opacity-60" />
            {tag}
            {onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="hover:text-white ml-0.5"
                >
                    <X className="w-2.5 h-2.5" />
                </button>
            )}
        </span>
    );
}

// ============ Tags Editor Popover ============
interface TagsEditorProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    availableTags?: string[];
}

export function TagsEditor({ tags, onTagsChange, availableTags = [] }: TagsEditorProps) {
    const [newTag, setNewTag] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const addTag = useCallback(() => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            onTagsChange([...tags, newTag.trim()]);
            setNewTag('');
            setIsAdding(false);
        }
    }, [newTag, tags, onTagsChange]);

    const removeTag = useCallback((tagToRemove: string) => {
        onTagsChange(tags.filter(t => t !== tagToRemove));
    }, [tags, onTagsChange]);

    const suggestedTags = availableTags.filter(t => !tags.includes(t));

    return (
        <div className="p-3 bg-[#252526] border border-[#3c3c3c] rounded-lg w-64">
            <div className="text-xs text-[#858585] mb-2">Tags</div>

            {/* Current tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map(tag => (
                    <TagBadge
                        key={tag}
                        tag={tag}
                        onRemove={() => removeTag(tag)}
                        size="md"
                    />
                ))}
                {tags.length === 0 && (
                    <span className="text-xs text-[#858585]">No tags</span>
                )}
            </div>

            {/* Add new tag */}
            {isAdding ? (
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                        placeholder="Tag name..."
                        className="flex-1 bg-[#3c3c3c] border border-[#3c3c3c] rounded px-2 py-1 text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc]"
                        autoFocus
                    />
                    <button
                        onClick={addTag}
                        className="p-1 bg-[#007acc] hover:bg-[#1a85dc] rounded"
                    >
                        <Check className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                        onClick={() => { setIsAdding(false); setNewTag(''); }}
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                    >
                        <X className="w-3.5 h-3.5 text-[#cccccc]" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 text-xs text-[#858585] hover:text-[#cccccc]"
                >
                    <Plus className="w-3 h-3" />
                    Add tag
                </button>
            )}

            {/* Suggested tags */}
            {suggestedTags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#3c3c3c]">
                    <div className="text-[10px] text-[#858585] mb-1.5">Suggestions</div>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestedTags.slice(0, 5).map(tag => (
                            <button
                                key={tag}
                                onClick={() => onTagsChange([...tags, tag])}
                                className="text-[10px] px-1.5 py-0.5 bg-[#1e1e1e] hover:bg-[#3c3c3c] text-[#858585] hover:text-[#cccccc] rounded"
                            >
                                + {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ Favorite Toggle ============
interface FavoriteButtonProps {
    isFavorite: boolean;
    onToggle: () => void;
    size?: 'sm' | 'md';
}

export function FavoriteButton({ isFavorite, onToggle, size = 'sm' }: FavoriteButtonProps) {
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`p-1 rounded hover:bg-[#3c3c3c] transition-colors ${isFavorite ? 'text-yellow-400' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Star className={`${iconSize} ${isFavorite ? 'fill-current' : ''}`} />
        </button>
    );
}

// ============ Recent Files Panel ============
interface RecentFile {
    id: string;
    name: string;
    path: string;
    lastOpened: Date;
}

interface RecentFilesPanelProps {
    files: RecentFile[];
    onFileSelect: (id: string) => void;
    onClear?: () => void;
}

export function RecentFilesPanel({ files, onFileSelect, onClear }: RecentFilesPanelProps) {
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (files.length === 0) {
        return (
            <div className="p-4 text-center text-xs text-[#858585]">
                No recent files
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs text-[#858585] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Recent Files
                </span>
                {onClear && (
                    <button
                        onClick={onClear}
                        className="text-[10px] text-[#858585] hover:text-[#cccccc]"
                    >
                        Clear
                    </button>
                )}
            </div>
            <div className="space-y-0.5">
                {files.map(file => (
                    <button
                        key={file.id}
                        onClick={() => onFileSelect(file.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#3c3c3c] text-left"
                    >
                        <FileText className="w-3.5 h-3.5 text-[#519aba] flex-shrink-0" />
                        <span className="flex-1 text-xs text-[#cccccc] truncate">{file.name}</span>
                        <span className="text-[10px] text-[#858585]">{formatTime(file.lastOpened)}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============ Favorites Panel ============
interface FavoriteFilesPanelProps {
    files: FileNode[];
    onFileSelect: (file: FileNode) => void;
}

export function FavoriteFilesPanel({ files, onFileSelect }: FavoriteFilesPanelProps) {
    if (files.length === 0) {
        return (
            <div className="p-4 text-center text-xs text-[#858585]">
                <Star className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No favorites yet
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="flex items-center gap-1.5 px-2 mb-2 text-xs text-[#858585]">
                <Star className="w-3 h-3 text-yellow-400" />
                Favorites
            </div>
            <div className="space-y-0.5">
                {files.map(file => (
                    <button
                        key={file.id}
                        onClick={() => onFileSelect(file)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#3c3c3c] text-left"
                    >
                        <FileText className="w-3.5 h-3.5 text-[#519aba] flex-shrink-0" />
                        <span className="flex-1 text-xs text-[#cccccc] truncate">{file.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
