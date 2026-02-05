'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronUp, ChevronDown, Replace } from 'lucide-react';

interface SearchBarProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (query: string) => void;
    onNext: () => void;
    onPrevious: () => void;
    onReplace: (replacement: string) => void;
    onReplaceAll: (replacement: string) => void;
    matchCount: number;
    currentMatch: number;
}

export function SearchBar({
    isOpen,
    onClose,
    onSearch,
    onNext,
    onPrevious,
    onReplace,
    onReplaceAll,
    matchCount,
    currentMatch,
}: SearchBarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [showReplace, setShowReplace] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen]);

    // Handle search on input change
    useEffect(() => {
        onSearch(searchQuery);
    }, [searchQuery, onSearch]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                onPrevious();
            } else {
                onNext();
            }
        }
    }, [onClose, onNext, onPrevious]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-4 z-50 bg-[#252526] border border-[#3c3c3c] rounded-md shadow-lg p-2 min-w-[320px]">
            {/* Search Row */}
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Find"
                    className="flex-1 bg-[#3c3c3c] border border-[#3c3c3c] rounded px-2 py-1 text-sm text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc]"
                />

                <span className="text-xs text-[#858585] min-w-[60px] text-center">
                    {matchCount > 0 ? `${currentMatch} of ${matchCount}` : 'No results'}
                </span>

                <button
                    onClick={onPrevious}
                    disabled={matchCount === 0}
                    className="p-1 hover:bg-[#3c3c3c] rounded disabled:opacity-50"
                    title="Previous (Shift+Enter)"
                >
                    <ChevronUp className="w-4 h-4 text-[#cccccc]" />
                </button>

                <button
                    onClick={onNext}
                    disabled={matchCount === 0}
                    className="p-1 hover:bg-[#3c3c3c] rounded disabled:opacity-50"
                    title="Next (Enter)"
                >
                    <ChevronDown className="w-4 h-4 text-[#cccccc]" />
                </button>

                <button
                    onClick={() => setShowReplace(!showReplace)}
                    className={`p-1 hover:bg-[#3c3c3c] rounded ${showReplace ? 'bg-[#3c3c3c]' : ''}`}
                    title="Toggle Replace"
                >
                    <Replace className="w-4 h-4 text-[#cccccc]" />
                </button>

                <button
                    onClick={onClose}
                    className="p-1 hover:bg-[#3c3c3c] rounded"
                    title="Close (Escape)"
                >
                    <X className="w-4 h-4 text-[#cccccc]" />
                </button>
            </div>

            {/* Replace Row */}
            {showReplace && (
                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="text"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        placeholder="Replace"
                        className="flex-1 bg-[#3c3c3c] border border-[#3c3c3c] rounded px-2 py-1 text-sm text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc]"
                    />

                    <button
                        onClick={() => onReplace(replaceQuery)}
                        disabled={matchCount === 0}
                        className="px-2 py-1 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-[#cccccc] disabled:opacity-50"
                    >
                        Replace
                    </button>

                    <button
                        onClick={() => onReplaceAll(replaceQuery)}
                        disabled={matchCount === 0}
                        className="px-2 py-1 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-[#cccccc] disabled:opacity-50"
                    >
                        Replace All
                    </button>
                </div>
            )}
        </div>
    );
}
