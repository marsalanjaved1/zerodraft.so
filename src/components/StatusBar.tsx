'use client';

import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import type { SaveStatus } from '@/lib/hooks/use-autosave';

interface StatusBarProps {
    saveStatus: SaveStatus;
    lastSaved: Date | null;
    wordCount?: { words: number; characters: number };
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

export function StatusBar({ saveStatus, lastSaved, wordCount }: StatusBarProps) {
    return (
        <div className="flex items-center justify-between px-4 py-1 bg-[#007acc] text-white text-xs">
            {/* Left side - Save status */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    {saveStatus === 'saving' && (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Saving...</span>
                        </>
                    )}
                    {saveStatus === 'saved' && (
                        <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Saved</span>
                        </>
                    )}
                    {saveStatus === 'error' && (
                        <>
                            <AlertCircle className="w-3 h-3 text-red-300" />
                            <span className="text-red-300">Save failed</span>
                        </>
                    )}
                    {saveStatus === 'idle' && lastSaved && (
                        <>
                            <Clock className="w-3 h-3 opacity-70" />
                            <span className="opacity-70">Saved {formatLastSaved(lastSaved)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Right side - Word count */}
            <div className="flex items-center gap-4">
                {wordCount && (
                    <>
                        <span>{wordCount.words} words</span>
                        <span>{wordCount.characters} characters</span>
                    </>
                )}
            </div>
        </div>
    );
}
