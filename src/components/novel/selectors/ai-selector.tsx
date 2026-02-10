"use client";

import { useCompletion } from "@ai-sdk/react";
import {
    Sparkles,
    Wand2,
    Brain,
    AlertTriangle,
    UserCheck,
    Loader2
} from "lucide-react";
import { useState } from "react";
import { type EditorInstance } from "novel";
import { toast } from "sonner"; // Assuming sonner is used, or basic alert

interface AISelectorProps {
    editor: EditorInstance;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export function AISelector({ editor, isOpen, setIsOpen }: AISelectorProps) {
    const [lastCommand, setLastCommand] = useState<string | null>(null);

    const { complete, completion, isLoading, stop } = useCompletion({
        api: "/api/generate",
        onFinish: (prompt, result) => {
            if (lastCommand === "inconsistency") {
                toast.message("Inconsistency Report", {
                    description: result,
                    duration: 10000,
                });
            } else {
                // For replacement commands, the stream handling is manual below for better control or just replacing selection.
                // We'll handle the insertion manually in the `onFinish` or via managing the stream if `useCompletion` supports it well for this.
                // Better approach for editor integration:
                // We receive the full completion here. We should replace the selection.
                const content = (editor.storage as any).markdown?.parser.parse(result) || result;
                editor.chain().focus().insertContent(content).run();
            }
            setLastCommand(null);
        },
        onError: (err) => {
            toast.error("AI Error: " + err.message);
            setLastCommand(null);
        }
    });

    // Custom handler to manage the "stream" effect if we wanted real-time replacement, 
    // but for simplicity and safety (undo/redo), we might just wait for finish or use a different hook.
    // However, users expect streaming. 
    // `useCompletion` returns `completion` string which updates live.
    // But modifying the editor *while* streaming is tricky without a dedicated extension.
    // For "Fixed Editor Toolbar", let's stick to:
    // 1. Show loading state.
    // 2. On finish, replace selection.
    // OR create a temporary "ghost" node. 
    // Let's go with: Replace selection on finish for now (Simplest Robust). 
    // Wait, "streamText" in API returns a stream. `useCompletion` handles it.

    // Improved Approach:
    // For "replace" commands (Grammar, Humanize), we might want to show the diff?
    // For now, let's just replace.

    const runCommand = async (command: string) => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to);

        if (!selectedText && command !== "think") {
            toast.error("Please select some text first.");
            return;
        }

        setLastCommand(command);

        // If "think", we might use context.
        const context = editor.getText(); // grab full text for context if needed

        if (command === "grammar" || command === "humanize") {
            // Delete selection immediately or wait? 
            // Better to keep selection and replace on finish to avoid losing it if error.
            // Or better: Show a "Streaming..." toast.
            toast.loading("AI is thinking...", { id: "ai-loading" });

            // We manually fetch because useCompletion is tied to specific state?
            // actually useCompletion `complete` function takes the prompt.

            await complete(selectedText, {
                body: { command, text: selectedText, context }
            });
            toast.dismiss("ai-loading");
            // The `onFinish` will handle insertion.
            // But we need to ensure we delete the OLD text first if we are replacing.
            editor.chain().focus().deleteRange({ from, to }).run();
        } else if (command === "think") {
            // For think, we usually append.
            toast.loading("Thinking...", { id: "ai-loading" });
            await complete(selectedText, {
                body: { command, text: selectedText, context }
            });
            toast.dismiss("ai-loading");
            // onFinish will insert (append behavior since we didn't delete).
        } else if (command === "inconsistency") {
            toast.loading("Analyzing...", { id: "ai-loading" });
            await complete(selectedText, {
                body: { command, text: selectedText, context }
            });
            toast.dismiss("ai-loading");
            // onFinish handles the toast report.
        }

        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-xl border border-stone-200 p-1 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
            <div className="text-xs font-semibold text-stone-500 px-2 py-1.5 uppercase tracking-wider">
                AI Commands
            </div>

            <button
                onClick={() => runCommand("grammar")}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100 rounded-sm text-left transition-colors"
            >
                <Wand2 size={16} className="text-purple-500" />
                <span>Fix Grammar</span>
            </button>

            <button
                onClick={() => runCommand("humanize")}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100 rounded-sm text-left transition-colors"
            >
                <UserCheck size={16} className="text-green-500" />
                <span>Humanize</span>
            </button>

            <button
                onClick={() => runCommand("think")}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100 rounded-sm text-left transition-colors"
            >
                <Brain size={16} className="text-blue-500" />
                <span>Think More</span>
            </button>

            <div className="h-px bg-stone-100 my-1" />

            <button
                onClick={() => runCommand("inconsistency")}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100 rounded-sm text-left transition-colors"
            >
                <AlertTriangle size={16} className="text-amber-500" />
                <span>Inconsistencies</span>
            </button>

            {isLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 className="animate-spin text-stone-500" size={20} />
                </div>
            )}
        </div>
    );
}
