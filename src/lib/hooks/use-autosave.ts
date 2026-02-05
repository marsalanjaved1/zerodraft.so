import { useRef, useEffect, useCallback, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions {
    /** Delay in ms before autosave triggers (default: 2000) */
    delay?: number;
    /** Callback to save content */
    onSave: (content: string) => Promise<void>;
    /** Called when save status changes */
    onStatusChange?: (status: SaveStatus) => void;
}

interface UseAutosaveReturn {
    /** Current save status */
    status: SaveStatus;
    /** Last saved timestamp */
    lastSaved: Date | null;
    /** Trigger manual save */
    saveNow: () => Promise<void>;
    /** Update content (debounced save) */
    updateContent: (content: string) => void;
    /** Check if there are unsaved changes */
    hasUnsavedChanges: boolean;
}

export function useAutosave({
    delay = 2000,
    onSave,
    onStatusChange,
}: UseAutosaveOptions): UseAutosaveReturn {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const contentRef = useRef<string>('');
    const savedContentRef = useRef<string>('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    // Update status and notify
    const updateStatus = useCallback((newStatus: SaveStatus) => {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
    }, [onStatusChange]);

    // Perform save
    const performSave = useCallback(async () => {
        if (isSavingRef.current) return;
        if (contentRef.current === savedContentRef.current) return;

        isSavingRef.current = true;
        updateStatus('saving');

        try {
            await onSave(contentRef.current);
            savedContentRef.current = contentRef.current;
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            updateStatus('saved');

            // Reset to idle after 2 seconds
            setTimeout(() => {
                setStatus((current) => current === 'saved' ? 'idle' : current);
            }, 2000);
        } catch (error) {
            console.error('Autosave failed:', error);
            updateStatus('error');
        } finally {
            isSavingRef.current = false;
        }
    }, [onSave, updateStatus]);

    // Manual save
    const saveNow = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        await performSave();
    }, [performSave]);

    // Update content with debounced save
    const updateContent = useCallback((content: string) => {
        contentRef.current = content;
        setHasUnsavedChanges(content !== savedContentRef.current);

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Schedule new save
        timeoutRef.current = setTimeout(() => {
            performSave();
        }, delay);
    }, [delay, performSave]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Save before unload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
                // Try to save synchronously (best effort)
                performSave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, performSave]);

    return {
        status,
        lastSaved,
        saveNow,
        updateContent,
        hasUnsavedChanges,
    };
}
