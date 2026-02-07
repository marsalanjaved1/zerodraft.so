"use client";

import { useState, useCallback } from "react";

export interface TrackedChange {
    id: string;
    original: string;
    suggested: string;
    reason?: string;
    position?: {
        from: number;
        to: number;
    };
    status: "pending" | "accepted" | "rejected";
    createdAt: Date;
}

interface UseTrackedChangesResult {
    changes: TrackedChange[];
    pendingCount: number;
    addChange: (change: Omit<TrackedChange, "id" | "status" | "createdAt">) => string;
    acceptChange: (id: string) => TrackedChange | undefined;
    rejectChange: (id: string) => void;
    acceptAll: () => TrackedChange[];
    rejectAll: () => void;
    clearResolved: () => void;
}

export function useTrackedChanges(): UseTrackedChangesResult {
    const [changes, setChanges] = useState<TrackedChange[]>([]);

    const pendingCount = changes.filter(c => c.status === "pending").length;

    const addChange = useCallback((change: Omit<TrackedChange, "id" | "status" | "createdAt">): string => {
        const id = crypto.randomUUID();
        const newChange: TrackedChange = {
            ...change,
            id,
            status: "pending",
            createdAt: new Date()
        };
        setChanges(prev => [...prev, newChange]);
        return id;
    }, []);

    const acceptChange = useCallback((id: string): TrackedChange | undefined => {
        let accepted: TrackedChange | undefined;
        setChanges(prev => prev.map(c => {
            if (c.id === id && c.status === "pending") {
                accepted = { ...c, status: "accepted" };
                return accepted;
            }
            return c;
        }));
        return accepted;
    }, []);

    const rejectChange = useCallback((id: string) => {
        setChanges(prev => prev.map(c =>
            c.id === id && c.status === "pending"
                ? { ...c, status: "rejected" }
                : c
        ));
    }, []);

    const acceptAll = useCallback((): TrackedChange[] => {
        const accepted: TrackedChange[] = [];
        setChanges(prev => prev.map(c => {
            if (c.status === "pending") {
                const updated = { ...c, status: "accepted" as const };
                accepted.push(updated);
                return updated;
            }
            return c;
        }));
        return accepted;
    }, []);

    const rejectAll = useCallback(() => {
        setChanges(prev => prev.map(c =>
            c.status === "pending"
                ? { ...c, status: "rejected" }
                : c
        ));
    }, []);

    const clearResolved = useCallback(() => {
        setChanges(prev => prev.filter(c => c.status === "pending"));
    }, []);

    return {
        changes,
        pendingCount,
        addChange,
        acceptChange,
        rejectChange,
        acceptAll,
        rejectAll,
        clearResolved
    };
}
