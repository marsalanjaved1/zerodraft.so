"use client";

import { useEffect, useRef, useState } from "react";

interface GhostTextOverlayProps {
    suggestion: string | null;
    isLoading: boolean;
    onAccept: () => void;
    onDismiss: () => void;
    editorElement: HTMLElement | null;
}

/**
 * Ghost text overlay that renders inline suggestions at the cursor position.
 * Uses Tab to accept, Esc to dismiss.
 */
export function GhostTextOverlay({
    suggestion,
    isLoading,
    onAccept,
    onDismiss,
    editorElement
}: GhostTextOverlayProps) {
    const overlayRef = useRef<HTMLSpanElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    // Update position based on cursor
    useEffect(() => {
        if (!editorElement || !suggestion) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                setPosition(null);
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = editorElement.getBoundingClientRect();

            if (rect.width === 0 && rect.height === 0) {
                // Collapsed cursor - use caret position
                setPosition({
                    top: rect.top - editorRect.top,
                    left: rect.left - editorRect.left
                });
            } else {
                // Selection - position at end
                setPosition({
                    top: rect.bottom - editorRect.top - rect.height,
                    left: rect.right - editorRect.left
                });
            }
        };

        updatePosition();
        // Also update on selection change
        document.addEventListener("selectionchange", updatePosition);
        return () => document.removeEventListener("selectionchange", updatePosition);
    }, [suggestion, editorElement]);

    // Handle keyboard shortcuts
    useEffect(() => {
        if (!suggestion) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                onAccept();
            } else if (e.key === "Escape") {
                e.preventDefault();
                onDismiss();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [suggestion, onAccept, onDismiss]);

    if (!suggestion || !position) return null;

    return (
        <span
            ref={overlayRef}
            className="ghost-text-suggestion"
            style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                pointerEvents: "none",
                color: "#9ca3af",
                fontStyle: "italic",
                opacity: 0.7,
                whiteSpace: "pre-wrap",
                animation: "ghostTextFadeIn 0.2s ease-out"
            }}
        >
            {suggestion}
            <span className="ghost-text-hint" style={{
                marginLeft: "8px",
                fontSize: "10px",
                color: "#d1d5db",
                fontStyle: "normal",
                background: "#f3f4f6",
                padding: "2px 4px",
                borderRadius: "3px"
            }}>
                Tab ↵
            </span>
        </span>
    );
}

// Loading indicator style
export function GhostTextLoading({ editorElement }: { editorElement: HTMLElement | null }) {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!editorElement) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorElement.getBoundingClientRect();

        setPosition({
            top: rect.top - editorRect.top,
            left: rect.left - editorRect.left + 4
        });
    }, [editorElement]);

    if (!position) return null;

    return (
        <span
            style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                pointerEvents: "none"
            }}
        >
            <span className="ghost-text-loading" style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                border: "2px solid #e5e7eb",
                borderTopColor: "#6366f1",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
            }} />
        </span>
    );
}
