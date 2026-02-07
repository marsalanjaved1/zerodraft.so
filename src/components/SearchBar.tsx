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
        <div className="absolute top-2 right-4 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[340px]">
            {/* Search Row */}
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Find..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                />

                <span className="text-xs text-gray-500 min-w-[60px] text-center">
                    {matchCount > 0 ? `${currentMatch} of ${matchCount}` : 'No results'}
                </span>

                <button
                    onClick={onPrevious}
                    disabled={matchCount === 0}
                    className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-colors"
                    title="Previous (Shift+Enter)"
                >
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                </button>

                <button
                    onClick={onNext}
                    disabled={matchCount === 0}
                    className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-colors"
                    title="Next (Enter)"
                >
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>

                <button
                    onClick={() => setShowReplace(!showReplace)}
                    className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${showReplace ? 'bg-indigo-50 text-indigo-600' : ''}`}
                    title="Toggle Replace"
                >
                    <Replace className="w-4 h-4 text-gray-600" />
                </button>

                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close (Escape)"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            {/* Replace Row */}
            {showReplace && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                    <input
                        type="text"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        placeholder="Replace with..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />

                    <button
                        onClick={() => onReplace(replaceQuery)}
                        disabled={matchCount === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-40 transition-colors"
                    >
                        Replace
                    </button>

                    <button
                        onClick={() => onReplaceAll(replaceQuery)}
                        disabled={matchCount === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-700 disabled:opacity-40 transition-colors"
                    >
                        Replace All
                    </button>
                </div>
            )}
        </div>
    );
}
