"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Bot, User, ArrowUp, Loader2, Check, AlertCircle, X,
    FileText, FolderOpen, Search, PenLine, ChevronDown,
    Copy, FileDown, Sparkles, BookOpen, Square, Play, GitCompare, Target
} from "lucide-react";
import type { FileNode } from "@/lib/types";
import { executeTool, TOOL_DEFINITIONS } from "@/lib/client-tools";
import { executeFileSystemTool } from "@/app/actions";
import { useTrackedChanges, TrackedChange } from "@/lib/hooks/use-tracked-changes";
import { TrackedChangesPanel } from "@/components/TrackedChangesPanel";
import { MemoryChips, formatMemoryForPrompt } from "@/components/MemoryChips";
import { ContextMentionDropdown, ContextChip } from "@/components/ContextMention";
import ReactMarkdown from "react-markdown";

interface MemoryItem {
    id: string;
    type: "goal" | "audience" | "tone" | "constraint";
    value: string;
}

interface Message {
    id: string;
    role: "user" | "assistant" | "tool";
    content: string;
    toolCalls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}

interface ToolCall {
    id: string;
    name: string;
    arguments: string;
    status: "pending" | "running" | "completed" | "error";
    result?: string;
}

interface Source {
    id: string;
    title: string;
    author?: string;
    publication?: string;
    url?: string;
    citationNumber: number;
}

// TrackedChange interface is now imported from use-tracked-changes hook

interface AgentPanelProps {
    isOpen: boolean;
    files: FileNode[];
    onFilesChange?: (files: FileNode[]) => void;
    onInsertText?: (text: string) => void;
    onReplaceSelection?: (text: string) => void;
    onSuggestEdit?: (change: TrackedChange) => void;
    workspaceId: string;
    selectedFile: FileNode | null;
    chatSessionId?: string;
    onApplyDiff?: (diff: { removed: string; added: string; position: number }) => void;
    onRefreshFiles?: () => void;
    onOpenFile?: (fileId: string) => void;
}

// Build folder tree string for context
function buildFolderTree(files: FileNode[], prefix: string = ""): string {
    let tree = "";
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isLast = i === files.length - 1;
        const connector = isLast ? "└── " : "├── ";
        const icon = file.type === "folder" ? "📁" : "📄";

        tree += `${prefix}${connector}${icon} ${file.name}\n`;

        if (file.type === "folder" && file.children && file.children.length > 0) {
            const childPrefix = prefix + (isLast ? "    " : "│   ");
            tree += buildFolderTree(file.children, childPrefix);
        }
    }
    return tree;
}

// Available models
const MODELS = [
    { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
    { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
    { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
    { id: "moonshotai/kimi-k2-thinking", name: "Kimi k2 Thinking" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash" },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek v3.2" },
    { id: "minimax/minimax-m2.1", name: "Minimax M2.1" },
];

// Writing tool names (handled client-side)
const WRITING_TOOLS = ["insert_text", "replace_selection", "suggest_edit", "add_comment", "get_selection", "search_document", "open_file_in_editor"];

function isWritingTool(toolName: string): boolean {
    return WRITING_TOOLS.includes(toolName);
}

export function AgentPanel({
    isOpen,
    files,
    onFilesChange,
    onInsertText,
    onReplaceSelection,
    onSuggestEdit,
    workspaceId,
    selectedFile,
    chatSessionId,
    onApplyDiff,
    onRefreshFiles,
    onOpenFile
}: AgentPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [shouldStop, setShouldStop] = useState(false);
    const [activeTab, setActiveTab] = useState<"chat" | "sources" | "changes">("chat");
    const [sources, setSources] = useState<Source[]>([]);
    const [currentFiles, setCurrentFiles] = useState<FileNode[]>(files);
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [agentMemory, setAgentMemory] = useState<MemoryItem[]>([]);
    const [showMemory, setShowMemory] = useState(false);
    const [contextFiles, setContextFiles] = useState<FileNode[]>([]);
    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");

    // Tracked changes management
    const {
        changes: trackedChanges,
        pendingCount: pendingChangesCount,
        addChange,
        acceptChange,
        rejectChange,
        acceptAll: acceptAllChanges,
        rejectAll: rejectAllChanges
    } = useTrackedChanges();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Keep files in sync
    useEffect(() => {
        setCurrentFiles(files);
    }, [files]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    // Execute writing tools locally
    const executeWritingToolLocal = useCallback((toolName: string, args: any): string => {
        switch (toolName) {
            case "insert_text": {
                if (onInsertText && args.text) {
                    onInsertText(args.text);
                    return `Inserted ${args.text.length} characters into the document.`;
                }
                return "Insert action queued - no handler available.";
            }
            case "replace_selection": {
                if (onReplaceSelection && args.new_text) {
                    onReplaceSelection(args.new_text);
                    return `Replaced selection with new text.${args.reason ? ` Reason: ${args.reason}` : ''}`;
                }
                return "Replace action queued - no handler available.";
            }
            case "suggest_edit": {
                if (args.original_text && args.suggested_text) {
                    // Apply inline diff in editor
                    if (onSuggestEdit) {
                        onSuggestEdit({
                            id: `change-${Date.now()}`,
                            original: args.original_text,
                            suggested: args.suggested_text,
                            reason: args.reason,
                            status: 'pending',
                            createdAt: new Date()
                        });
                    }
                    return `Applied inline change: ~~"${args.original_text.slice(0, 20)}..."~~ → "${args.suggested_text.slice(0, 20)}..."`;
                }
                return "Suggest edit action queued - missing text.";
            }
            case "add_comment": {
                return `Comment added on: "${args.target_text?.slice(0, 30)}...": ${args.comment}`;
            }
            case "get_selection": {
                return "No text currently selected.";
            }
            case "search_document": {
                const content = selectedFile?.content || "";
                if (args.query && content.toLowerCase().includes(args.query.toLowerCase())) {
                    return `Found "${args.query}" in document.`;
                }
                return `"${args.query}" not found in document.`;
            }
            case "open_file_in_editor": {
                // Find the file by name/path in the current files
                const findFile = (nodes: FileNode[], filename: string): FileNode | null => {
                    for (const node of nodes) {
                        if (node.name.toLowerCase() === filename.toLowerCase() ||
                            node.path?.toLowerCase().includes(filename.toLowerCase())) {
                            return node;
                        }
                        if (node.children) {
                            const found = findFile(node.children, filename);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const targetFile = findFile(currentFiles, args.filename || args.path);
                if (targetFile && onOpenFile) {
                    onOpenFile(targetFile.id);
                    return `Opened "${targetFile.name}" in the editor. You can now use suggest_edit to make changes.`;
                }
                return `Could not find file "${args.filename || args.path}" to open.`;
            }
            default:
                return `Unknown writing tool: ${toolName}`;
        }
    }, [onInsertText, onReplaceSelection, onSuggestEdit, selectedFile, currentFiles, onOpenFile]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Main agentic loop - executes tools and continues until done
    const runAgenticLoop = useCallback(async (
        initialMessages: Message[],
        onMessagesUpdate: (msgs: Message[]) => void
    ) => {
        let currentMessages = [...initialMessages];
        let loopCount = 0;
        const maxLoops = 10; // Safety limit

        while (loopCount < maxLoops && !shouldStop) {
            loopCount++;

            try {
                // Build context for API
                const folderTree = buildFolderTree(currentFiles);

                // Prepare tool results if last message has completed tool calls
                const lastMessage = currentMessages[currentMessages.length - 1];
                let toolResults: any[] = [];

                if (lastMessage?.role === "assistant" && lastMessage.toolCalls) {
                    const completedTools = lastMessage.toolCalls.filter(tc => tc.status === "completed");
                    if (completedTools.length > 0) {
                        toolResults = completedTools.map(tc => ({
                            toolCallId: tc.id,
                            toolName: tc.name,
                            result: tc.result || "",
                            args: JSON.parse(tc.arguments || "{}")
                        }));
                    }
                }

                // Call API
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: currentMessages.map(m => ({
                            role: m.role,
                            content: m.content,
                            tool_call_id: m.tool_call_id,
                            name: m.name,
                        })),
                        model: selectedModel,
                        workspaceId,
                        fileId: selectedFile?.id,
                        chatSessionId,
                        folderTree,
                        currentFile: selectedFile ? {
                            name: selectedFile.name,
                            path: selectedFile.path,
                            content: selectedFile.content?.slice(0, 5000)
                        } : null,
                        contextFiles: contextFiles.length > 0 ? contextFiles.map(f => ({
                            name: f.name,
                            path: f.path,
                            content: f.content?.slice(0, 3000)
                        })) : undefined,
                        toolResults: toolResults.length > 0 ? toolResults : undefined,
                        memoryContext: agentMemory.length > 0 ? formatMemoryForPrompt(agentMemory) : undefined
                    }),
                    signal: abortControllerRef.current?.signal
                });

                if (!response.ok) throw new Error("API request failed");

                const data = await response.json();

                // Handle tool calls
                if (data.type === "tool_calls" && data.toolCalls?.length > 0) {
                    const toolCallMessage: Message = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: data.content || "",
                        toolCalls: data.toolCalls.map((tc: any) => ({
                            id: tc.id,
                            name: tc.name,
                            arguments: JSON.stringify(tc.args || {}),
                            status: "pending" as const,
                        })),
                    };

                    currentMessages = [...currentMessages, toolCallMessage];
                    onMessagesUpdate(currentMessages);

                    // Execute each tool
                    for (const toolCall of toolCallMessage.toolCalls || []) {
                        if (shouldStop) break;

                        // Update status to running
                        const updateToolStatus = (status: ToolCall["status"], result?: string) => {
                            currentMessages = currentMessages.map(m =>
                                m.id === toolCallMessage.id
                                    ? {
                                        ...m,
                                        toolCalls: m.toolCalls?.map(tc =>
                                            tc.id === toolCall.id
                                                ? { ...tc, status, result }
                                                : tc
                                        )
                                    }
                                    : m
                            );
                            onMessagesUpdate(currentMessages);
                        };

                        updateToolStatus("running");

                        // Small delay for visual feedback
                        await new Promise(resolve => setTimeout(resolve, 300));

                        try {
                            const args = JSON.parse(toolCall.arguments);

                            // Check if it's a writing tool
                            if (isWritingTool(toolCall.name)) {
                                const result = executeWritingToolLocal(toolCall.name, args);
                                updateToolStatus("completed", result);
                            } else if (toolCall.name.startsWith("fs_")) {
                                // Execute Server-Side File System Tool
                                const result = await executeFileSystemTool(workspaceId, toolCall.name, args);
                                updateToolStatus("completed", result);

                                // Refresh sidebar after file creation/write operations
                                if ((toolCall.name === "fs_write_file" || toolCall.name === "fs_create_file") &&
                                    result && !result.includes("Error")) {
                                    onRefreshFiles?.();
                                }
                            } else {
                                // Legacy File system tool (client-side mocks or other tools)
                                const result = executeTool(
                                    currentFiles,
                                    toolCall.name,
                                    args
                                );

                                // Update files if changed
                                if (result.updatedFiles) {
                                    setCurrentFiles(result.updatedFiles);
                                    onFilesChange?.(result.updatedFiles);
                                }

                                updateToolStatus("completed", result.result);
                            }
                        } catch (err: any) {
                            updateToolStatus("error", err.message || "Tool execution failed");
                        }
                    }

                    // Continue loop to process tool results
                    continue;
                }

                // Final message - no more tools needed
                if (data.type === "message" || data.content) {
                    const assistantMessage: Message = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: data.content || "",
                    };
                    currentMessages = [...currentMessages, assistantMessage];
                    onMessagesUpdate(currentMessages);
                    break; // Exit loop
                }

                break; // Safety exit

            } catch (error: any) {
                if (error.name === "AbortError") {
                    // User stopped execution
                    break;
                }

                console.error("Agentic loop error:", error);
                const errorMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `Error: ${error.message || "Something went wrong"}`,
                };
                currentMessages = [...currentMessages, errorMessage];
                onMessagesUpdate(currentMessages);
                break;
            }
        }

        return currentMessages;
    }, [currentFiles, selectedFile, workspaceId, chatSessionId, shouldStop, onFilesChange]);

    const handleSubmit = async () => {
        if (!input.trim() || isLoading || isExecuting) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input,
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);
        setIsExecuting(true);
        setShouldStop(false);

        abortControllerRef.current = new AbortController();

        try {
            await runAgenticLoop(newMessages, setMessages);
        } finally {
            setIsLoading(false);
            setIsExecuting(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        setShouldStop(true);
        abortControllerRef.current?.abort();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Let the mention dropdown handle arrow keys when open
        if (showMentionMenu && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape")) {
            return; // Don't prevent default, let ContextMentionDropdown handle it
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        // Detect @ trigger for file mentions
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            setShowMentionMenu(true);
            setMentionQuery(atMatch[1] || "");
        } else {
            setShowMentionMenu(false);
            setMentionQuery("");
        }
    };

    const handleSelectContextFile = (file: FileNode) => {
        // Remove the @query from input
        const cursorPos = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = input.slice(0, cursorPos);
        const newTextBefore = textBeforeCursor.replace(/@\w*$/, "");
        const textAfterCursor = input.slice(cursorPos);
        setInput(newTextBefore + textAfterCursor);

        // Add file to context if not already there
        if (!contextFiles.find(f => f.id === file.id)) {
            setContextFiles([...contextFiles, file]);
        }
        setShowMentionMenu(false);
        setMentionQuery("");
        inputRef.current?.focus();
    };

    const handleRemoveContextFile = (fileId: string) => {
        setContextFiles(contextFiles.filter(f => f.id !== fileId));
    };

    const handleInsertText = (text: string) => {
        onInsertText?.(text);
    };

    const handleCopyText = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (!isOpen) return null;

    return (
        <aside className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col flex-none">
            {/* Header with Tabs */}
            <div className="flex items-center border-b border-gray-200 bg-white">
                <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === "chat"
                        ? "text-gray-900 border-b-2 border-indigo-500"
                        : "text-gray-500 hover:text-gray-900"
                        }`}
                    onClick={() => setActiveTab("chat")}
                >
                    Chat
                </button>
                <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-all relative ${activeTab === "changes"
                        ? "text-gray-900 border-b-2 border-indigo-500"
                        : "text-gray-500 hover:text-gray-900"
                        }`}
                    onClick={() => setActiveTab("changes")}
                >
                    Changes
                    {pendingChangesCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {pendingChangesCount}
                        </span>
                    )}
                </button>
                <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${activeTab === "sources"
                        ? "text-gray-900 border-b-2 border-indigo-500"
                        : "text-gray-500 hover:text-gray-900"
                        }`}
                    onClick={() => setActiveTab("sources")}
                >
                    Sources
                </button>
            </div>

            {activeTab === "chat" ? (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center px-6">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
                                    <Sparkles className="w-5 h-5 text-indigo-600" />
                                </div>
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                    AI Agent Ready
                                </p>
                                <p className="text-xs text-gray-500">
                                    I can read files, write content, and help you work.
                                </p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div key={message.id} className="animate-fade-in">
                                {message.role === "user" ? (
                                    // User message
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] bg-gray-900 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                                            {message.content}
                                        </div>
                                    </div>
                                ) : (
                                    // Assistant message
                                    <div className="space-y-3">
                                        {/* Tool calls */}
                                        {message.toolCalls?.map((toolCall) => (
                                            <div
                                                key={toolCall.id}
                                                className={`tool-call-card ${toolCall.status === "running" ? "running" :
                                                    toolCall.status === "completed" ? "completed" :
                                                        toolCall.status === "error" ? "error" : ""
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {toolCall.status === "running" && (
                                                        <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                                    )}
                                                    {toolCall.status === "completed" && (
                                                        <Check className="w-3 h-3 text-green-600" />
                                                    )}
                                                    {toolCall.status === "error" && (
                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                    )}
                                                    {toolCall.status === "pending" && (
                                                        <div className="w-3 h-3 rounded-full border border-gray-300" />
                                                    )}
                                                    <span className="text-gray-700 font-medium text-xs">
                                                        {getToolDisplayName(toolCall.name)}
                                                    </span>
                                                </div>
                                                {toolCall.arguments && (
                                                    <p className="text-gray-500 mt-1 text-[11px] truncate">
                                                        {formatToolArgs(toolCall.name, toolCall.arguments)}
                                                    </p>
                                                )}
                                            </div>
                                        ))}

                                        {/* Message content */}
                                        {message.content && (
                                            <div className="agent-message">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-indigo-700 text-[10px] font-bold">Z</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-gray-700 prose prose-sm max-w-none prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-900 prose-pre:text-gray-100">
                                                            <ReactMarkdown>{message.content}</ReactMarkdown>
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <button
                                                                onClick={() => handleInsertText(message.content)}
                                                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <FileDown className="w-3 h-3" />
                                                                Insert
                                                            </button>
                                                            <button
                                                                onClick={() => handleCopyText(message.content)}
                                                                className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                                Copy
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && !messages[messages.length - 1]?.toolCalls && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Memory Context (Collapsible) */}
                    {showMemory && (
                        <div className="border-t border-gray-200 bg-gray-50">
                            <MemoryChips
                                onMemoryChange={setAgentMemory}
                                initialMemory={agentMemory}
                            />
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-200">
                        {/* Memory toggle button */}
                        <button
                            onClick={() => setShowMemory(!showMemory)}
                            className={`mb-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${showMemory || agentMemory.length > 0
                                ? "bg-indigo-50 text-indigo-600"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            <Target className="w-3 h-3" />
                            Context
                            {agentMemory.length > 0 && (
                                <span className="bg-indigo-500 text-white text-[10px] px-1.5 rounded-full">
                                    {agentMemory.length}
                                </span>
                            )}
                        </button>

                        {/* Context File Chips */}
                        {contextFiles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {contextFiles.map(f => (
                                    <ContextChip
                                        key={f.id}
                                        file={f}
                                        onRemove={() => handleRemoveContextFile(f.id)}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            {/* Mention Dropdown */}
                            <ContextMentionDropdown
                                files={currentFiles}
                                isOpen={showMentionMenu}
                                onSelect={handleSelectContextFile}
                                onClose={() => setShowMentionMenu(false)}
                                searchQuery={mentionQuery}
                            />

                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask AI to help write, edit, or research... (@ to add context)"
                                className="w-full resize-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all min-h-[48px] max-h-[200px] overflow-y-auto"
                                rows={1}
                                disabled={isExecuting}
                            />
                            {isExecuting ? (
                                <button
                                    onClick={handleStop}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                                    title="Stop execution"
                                >
                                    <Square className="w-3 h-3 fill-current" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 text-center">
                            {isExecuting ? (
                                <span className="text-indigo-600">Agent executing...</span>
                            ) : (
                                <>Type <span className="font-medium text-gray-500">@</span> to add files as context</>
                            )}
                        </p>
                    </div>
                </>
            ) : activeTab === "sources" ? (
                // Sources Tab
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900">Active Sources</h3>
                            <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                                + Add Source
                            </button>
                        </div>

                        {sources.length === 0 ? (
                            <div className="text-center py-8">
                                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No sources added yet</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Add sources to cite in your document
                                </p>
                            </div>
                        ) : (
                            sources.map((source) => (
                                <div key={source.id} className="card card-hover group">
                                    <div className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold flex items-center justify-center">
                                            {source.citationNumber}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {source.title}
                                            </p>
                                            {source.author && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {source.author}
                                                    {source.publication && ` – ${source.publication}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : activeTab === "changes" ? (
                /* Changes Tab Content */
                <div className="flex-1 overflow-y-auto">
                    <TrackedChangesPanel
                        changes={trackedChanges}
                        onAccept={(id) => {
                            const change = acceptChange(id);
                            if (change && onReplaceSelection) {
                                // Apply the accepted change to the document
                                // Note: This would need to search and replace in the editor
                                console.log("Accepted change:", change);
                            }
                        }}
                        onReject={rejectChange}
                        onAcceptAll={() => {
                            const accepted = acceptAllChanges();
                            console.log("Accepted all changes:", accepted);
                        }}
                        onRejectAll={rejectAllChanges}
                    />
                </div>
            ) : null}

            {/* Model Selector Footer */}
            <div className="p-3 border-t border-gray-200 bg-white relative">
                <button
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                >
                    <span className="text-gray-500">Model:</span>
                    <span className="font-medium text-gray-700 flex items-center gap-1">
                        {MODELS.find(m => m.id === selectedModel)?.name || "Select model"}
                        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
                    </span>
                </button>

                {/* Model Dropdown Menu */}
                {showModelMenu && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                        {MODELS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    setSelectedModel(model.id);
                                    setShowModelMenu(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedModel === model.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                    }`}
                            >
                                <span>{model.name}</span>
                                {selectedModel === model.id && (
                                    <Check className="w-3 h-3 text-indigo-600" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}

// Helper functions
function getToolDisplayName(name: string): string {
    const names: Record<string, string> = {
        "fs_read_file": "Reading file",
        "fs_list_directory": "Listing files",
        "fs_write_file": "Writing to file",
        "fs_update_file": "Updating file",
        "search_files": "Searching files",
        "web_search": "Searching web",
        "insert_text": "Inserting text",
        "replace_selection": "Replacing selection",
    };
    return names[name] || name;
}

function formatToolArgs(name: string, args: string): string {
    try {
        const parsed = JSON.parse(args);
        if (name === "fs_read_file") return parsed.path;
        if (name === "fs_list_directory") return parsed.path || "/";
        if (name === "fs_write_file") return parsed.path;
        if (name === "fs_update_file") return parsed.path;
        if (name === "search_files") return `"${parsed.query}"`;
        return JSON.stringify(parsed);
    } catch {
        return args;
    }
}
