'use client';

import { Cloud, CheckCircle2, Loader2, ToggleLeft, ToggleRight, MessageSquare, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { SaveStatus } from '@/lib/hooks/use-autosave';

interface StatusBarProps {
    saveStatus: SaveStatus;
    lastSaved: Date | null;
    wordCount?: { words: number; characters: number };
    readTime?: number; // minutes
    isGhostTextEnabled?: boolean;
    onToggleGhostText?: () => void;
    isAgentPanelOpen?: boolean;
    onToggleAgentPanel?: () => void;
}

function formatLastSaved(date: Date | null): string {
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateReadTime(words: number): number {
    // Average reading speed: 200 words per minute
    return Math.max(1, Math.ceil(words / 200));
}

export function StatusBar({ saveStatus, lastSaved, wordCount, isGhostTextEnabled, onToggleGhostText, isAgentPanelOpen, onToggleAgentPanel }: StatusBarProps) {
    const readTime = wordCount ? calculateReadTime(wordCount.words) : 0;

    return (
        <div className="flex-none bg-white border-t border-border py-2 px-8 flex items-center justify-between text-[11px] text-gray-400 font-medium">
            {/* Left side - Word count & AutoComplete */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    {wordCount && (
                        <>
                            <span>{wordCount.words.toLocaleString()} words</span>
                            <span>{wordCount.characters.toLocaleString()} characters</span>
                        </>
                    )}
                </div>

                {/* AutoComplete Toggle */}
                {onToggleGhostText && (
                    <button
                        onClick={onToggleGhostText}
                        className={`flex items-center gap-1.5 transition-colors ${isGhostTextEnabled ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title={isGhostTextEnabled ? 'Disable autocomplete' : 'Enable autocomplete'}
                    >
                        {isGhostTextEnabled ? (
                            <ToggleRight className="w-4 h-4" />
                        ) : (
                            <ToggleLeft className="w-4 h-4" />
                        )}
                        <span>Autocomplete</span>
                    </button>
                )}
            </div>

            {/* Right side - Read time + Save status */}
            <div className="flex items-center gap-4">
                {readTime > 0 && (
                    <span>{readTime} min read</span>
                )}

                {/* Save status indicator */}
                {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1.5 text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving...
                    </span>
                )}
                {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <Cloud className="w-3 h-3" />
                        Saved
                    </span>
                )}
                {saveStatus === 'error' && (
                    <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        Save failed
                    </span>
                )}
                {saveStatus === 'idle' && lastSaved && (
                    <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                    </span>
                )}
            </div>

            {/* Chat Panel Toggle */}
            {onToggleAgentPanel && (
                <button
                    onClick={onToggleAgentPanel}
                    className={`flex items-center gap-1.5 transition-colors px-2 py-0.5 rounded-md ${isAgentPanelOpen ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                    title={isAgentPanelOpen ? 'Close Chat' : 'Open Chat'}
                >
                    {isAgentPanelOpen ? (
                        <PanelRightClose className="w-3 h-3" />
                    ) : (
                        <PanelRightOpen className="w-3 h-3" />
                    )}
                    <span>Chat</span>
                </button>
            )}
        </div>
    );
}
