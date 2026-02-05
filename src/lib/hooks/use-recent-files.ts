'use client';

import { useState, useEffect, useCallback } from 'react';

interface RecentFileEntry {
    id: string;
    name: string;
    path: string;
    lastOpened: number; // timestamp
}

interface UseRecentFilesOptions {
    workspaceId: string;
    maxFiles?: number;
}

const STORAGE_KEY_PREFIX = 'zerodraft_recent_files_';

export function useRecentFiles({ workspaceId, maxFiles = 10 }: UseRecentFilesOptions) {
    const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);
    const storageKey = `${STORAGE_KEY_PREFIX}${workspaceId}`;

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                setRecentFiles(parsed);
            }
        } catch (e) {
            console.error('Failed to load recent files:', e);
        }
    }, [storageKey]);

    // Save to localStorage whenever recentFiles changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(recentFiles));
        } catch (e) {
            console.error('Failed to save recent files:', e);
        }
    }, [recentFiles, storageKey]);

    // Track when a file is opened
    const trackFileOpen = useCallback((file: { id: string; name: string; path: string }) => {
        setRecentFiles(prev => {
            // Remove if already exists
            const filtered = prev.filter(f => f.id !== file.id);

            // Add to front with new timestamp
            const updated = [
                { ...file, lastOpened: Date.now() },
                ...filtered
            ].slice(0, maxFiles);

            return updated;
        });
    }, [maxFiles]);

    // Remove a file from recent
    const removeFromRecent = useCallback((fileId: string) => {
        setRecentFiles(prev => prev.filter(f => f.id !== fileId));
    }, []);

    // Clear all recent files
    const clearRecent = useCallback(() => {
        setRecentFiles([]);
    }, []);

    // Get recent files with Date objects for display
    const getRecentFilesWithDates = useCallback(() => {
        return recentFiles.map(f => ({
            ...f,
            lastOpened: new Date(f.lastOpened)
        }));
    }, [recentFiles]);

    return {
        recentFiles: getRecentFilesWithDates(),
        trackFileOpen,
        removeFromRecent,
        clearRecent,
    };
}
