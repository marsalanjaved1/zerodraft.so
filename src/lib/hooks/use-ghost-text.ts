"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseGhostTextOptions {
    delay?: number;  // Debounce delay in ms
    minChars?: number;  // Minimum characters before triggering
    enabled?: boolean;
    model?: string;
    context?: {
        fileName?: string;
        fileContent?: string;
    };
}

interface GhostTextResult {
    suggestion: string | null;
    isLoading: boolean;
    accept: () => void;
    dismiss: () => void;
    triggerSuggestion: (text: string, cursorPosition: number) => void;
}

export function useGhostText(options: UseGhostTextOptions = {}): GhostTextResult {
    const {
        delay = 1500,
        minChars = 10,
        enabled = true,
        model = "anthropic/claude-haiku-4.5",
        context
    } = options;

    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastTextRef = useRef<string>("");

    // Clear any pending requests
    const clearPending = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    // Fetch suggestion from API
    const fetchSuggestion = useCallback(async (text: string, cursorPosition: number) => {
        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setIsLoading(true);

        try {
            const response = await fetch("/api/ghost-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    cursorPosition,
                    model,
                    context
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error("Failed to get suggestion");

            const data = await response.json();

            if (data.suggestion && data.suggestion.trim()) {
                setSuggestion(data.suggestion);
            } else {
                setSuggestion(null);
            }
        } catch (error: any) {
            if (error.name !== "AbortError") {
                console.error("Ghost text error:", error);
            }
            setSuggestion(null);
        } finally {
            setIsLoading(false);
        }
    }, [model, context]);

    // Trigger suggestion with debounce
    const triggerSuggestion = useCallback((text: string, cursorPosition: number) => {
        if (!enabled) return;

        // Don't trigger if text hasn't changed
        if (text === lastTextRef.current) return;
        lastTextRef.current = text;

        // Clear existing suggestion immediately when typing
        setSuggestion(null);
        clearPending();

        // Don't trigger for very short texts
        if (text.length < minChars) return;

        // Debounce the API call
        timeoutRef.current = setTimeout(() => {
            fetchSuggestion(text, cursorPosition);
        }, delay);
    }, [enabled, minChars, delay, fetchSuggestion, clearPending]);

    // Accept the current suggestion
    const accept = useCallback(() => {
        if (suggestion) {
            // The parent component should handle inserting the text
            setSuggestion(null);
        }
    }, [suggestion]);

    // Dismiss the current suggestion
    const dismiss = useCallback(() => {
        setSuggestion(null);
        clearPending();
    }, [clearPending]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearPending();
        };
    }, [clearPending]);

    return {
        suggestion,
        isLoading,
        accept,
        dismiss,
        triggerSuggestion
    };
}
