"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Bot, User, ArrowUp, Loader2, Check, AlertCircle, X,
    FileText, FolderOpen, Search, PenLine, ChevronDown,
    Copy, FileDown, Sparkles, BookOpen, Square, Play, GitCompare, Target,
    History, Plus, MessageSquare, Globe, ChevronRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
    plan?: any;
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
    onSuggestEdit?: (change: TrackedChange) => string;
    workspaceId: string;
    selectedFile: FileNode | null;
    editorContent?: string;
    chatSessionId?: string;
    onApplyDiff?: (diff: { removed: string; added: string; position: number }) => void;
    onRefreshFiles?: () => void;
    onOpenFile?: (fileId: string) => void;
    onClose?: () => void;
}

interface ChatSession {
    id: string;
    title: string;
    created_at: string;
}

// Build folder tree string for context
function buildFolderTree(files: FileNode[], prefix: string = "", seenPaths: Set<string> = new Set()): string {
    let tree = "";
    // Filter out duplicates at this level before processing
    const uniqueFiles = files.filter(file => {
        if (!file.path) return true;
        if (seenPaths.has(file.path)) return false;
        seenPaths.add(file.path);
        return true;
    });

    for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        const isLast = i === uniqueFiles.length - 1;
        const connector = isLast ? "└── " : "├── ";
        const icon = file.type === "folder" ? "📁" : "📄";

        tree += `${prefix}${connector}${icon} ${file.name}\n`;

        if (file.type === "folder" && file.children && file.children.length > 0) {
            const childPrefix = prefix + (isLast ? "    " : "│   ");
            tree += buildFolderTree(file.children, childPrefix, seenPaths);
        }
    }
    return tree;
}

// Available models
const MODELS = [
    { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", maxTokens: 200000 },
    { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", maxTokens: 200000 },
    { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", maxTokens: 200000 },
    { id: "moonshotai/kimi-k2-thinking", name: "Kimi k2 Thinking", maxTokens: 200000 },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash", maxTokens: 1000000 },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek v3.2", maxTokens: 64000 },
    { id: "minimax/minimax-m2.5", name: "Minimax M2.5", maxTokens: 204800 },
];

// Writing tool names (handled client-side)
const WRITING_TOOLS = ["insert_text", "replace_selection", "suggest_edit", "get_selection", "search_document", "open_file_in_editor"];

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
    editorContent,
    chatSessionId,
    onApplyDiff,
    onRefreshFiles,
    onOpenFile,
    onClose
}: AgentPanelProps) {
    const supabase = createClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [view, setView] = useState<'chat' | 'history'>('chat');
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
    const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const togglePlan = (msgId: string) => {
        setExpandedPlans(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    // Ref to always have the latest editor content (avoids closure staleness)
    const editorContentRef = useRef(editorContent);
    useEffect(() => {
        editorContentRef.current = editorContent;
    }, [editorContent]);

    // Load sessions on mount
    useEffect(() => {
        if (isOpen) {
            const fetchSessions = async () => {
                const { data } = await supabase
                    .from('chats')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: false });
                if (data) setSessions(data);
            };
            fetchSessions();
        }
    }, [isOpen, workspaceId, supabase]);

    // Load messages when session changes
    useEffect(() => {
        if (currentSessionId) {
            const fetchMessages = async () => {
                const { data } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', currentSessionId)
                    .order('created_at', { ascending: true });

                if (data) {
                    const loadedMessages: Message[] = data.map(msg => ({
                        id: msg.id,
                        role: msg.role as any,
                        content: msg.content || "",
                        toolCalls: msg.tool_calls ? (msg.tool_calls as any[]).map((tc: any) => ({
                            ...tc,
                            status: tc.status || 'completed'
                        })) : undefined
                    }));
                    setMessages(loadedMessages);
                }
            };
            fetchMessages();
        } else {
            setMessages([]);
        }
    }, [currentSessionId, supabase]);

    // Helper to create new session
    const createNewSession = useCallback(async (title: string) => {
        const { data } = await supabase.from('chats').insert({
            workspace_id: workspaceId,
            title: title || "New Chat"
        }).select().single();

        if (data) {
            setSessions(prev => [data, ...prev]);
            setCurrentSessionId(data.id);
            return data.id;
        }
        return null;
    }, [workspaceId, supabase]);

    // Helper to save message
    const saveMessageToDb = useCallback(async (message: Message, sessionId: string) => {
        await supabase.from('messages').upsert({
            id: message.id,
            chat_id: sessionId,
            role: message.role,
            content: message.content,
            tool_calls: message.toolCalls ? message.toolCalls : null
        });
    }, [supabase]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [shouldStop, setShouldStop] = useState(false);

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
                if (!selectedFile) {
                    return "FILE_NOT_OPEN: No file is currently open in the editor. You must use 'open_file_in_editor' first.";
                }

                if (args.search_text !== undefined && args.replacement_text !== undefined) {
                    if (onSuggestEdit) {
                        const result = onSuggestEdit({
                            id: `change-${Date.now()}`,
                            searchText: args.search_text || "",
                            replacementText: args.replacement_text || "",
                            reason: args.reason,
                            status: 'pending',
                            createdAt: new Date()
                        });
                        return result;
                    }
                    return "Suggest edit action queued - no handler available.";
                }
                return "Suggest edit action failed - missing search_text or replacement_text.";
            }

            case "get_selection": {
                return "No text currently selected.";
            }
            case "search_document": {
                const content = editorContentRef.current || selectedFile?.content || "";
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
        onMessagesUpdate: (msgs: Message[]) => void,
        explicitSessionId?: string
    ) => {
        let currentMessages = [...initialMessages];
        let loopCount = 0;
        const maxLoops = 10; // Safety limit

        // Use explicit, prop, or state ID - in that order
        const effectiveSessionId = explicitSessionId || chatSessionId || currentSessionId;
        console.log("[AgentPanel] runAgenticLoop starting. ExplicitID:", explicitSessionId, "EffectiveID:", effectiveSessionId);

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
                            ...(m.toolCalls && m.toolCalls.length > 0 ? {
                                toolCalls: m.toolCalls.map(tc => ({
                                    id: tc.id,
                                    name: tc.name,
                                    arguments: tc.arguments,
                                }))
                            } : {}),
                        })).filter(m =>
                            m.role !== "assistant" ||
                            (m.content && m.content.trim() !== "") ||
                            m.tool_call_id ||
                            (m.toolCalls && m.toolCalls.length > 0)
                        ),
                        model: selectedModel,
                        workspaceId,
                        fileId: selectedFile?.id,
                        chatSessionId: effectiveSessionId,
                        folderTree,
                        currentFile: selectedFile ? {
                            name: selectedFile.name,
                            path: selectedFile.path,
                            content: editorContent || selectedFile.content || ""
                        } : null,
                        contextFiles: contextFiles.length > 0 ? contextFiles.map(f => ({
                            name: f.name,
                            path: f.path,
                            content: f.content?.slice(0, 3000)
                        })) : undefined,
                        toolResults: toolResults.length > 0 ? toolResults : undefined,
                        memoryContext: agentMemory.length > 0 ? formatMemoryForPrompt(agentMemory) : undefined,
                        webSearchEnabled: isWebSearchEnabled
                    }),
                    signal: abortControllerRef.current?.signal
                });

                if (!response.ok) throw new Error("API request failed");

                const contentType = response.headers.get("content-type") || "";

                let streamedToolCalls: any = null;

                // Handle SSE streaming response (final messages)
                if (contentType.includes("text/event-stream")) {
                    const reader = response.body?.getReader();
                    if (!reader) throw new Error("No response body");

                    const decoder = new TextDecoder();
                    let accumulatedContent = "";
                    const assistantMessageId = crypto.randomUUID();

                    // Add an empty assistant message that we'll update with tokens
                    const streamMessage: Message = {
                        id: assistantMessageId,
                        role: "assistant",
                        content: "",
                    };
                    currentMessages = [...currentMessages, streamMessage];
                    onMessagesUpdate(currentMessages);

                    let buffer = "";
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || ""; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (!line.startsWith("data: ")) continue;
                            try {
                                const event = JSON.parse(line.slice(6));
                                if (event.type === "token" && event.content) {
                                    accumulatedContent += event.content;
                                    // Update the message in-place for progressive display
                                    currentMessages = currentMessages.map(m =>
                                        m.id === assistantMessageId
                                            ? { ...m, content: accumulatedContent }
                                            : m
                                    );
                                    onMessagesUpdate(currentMessages);
                                } else if (event.type === "planning") {
                                    // Update message with plan
                                    currentMessages = currentMessages.map(m =>
                                        m.id === assistantMessageId
                                            ? { ...m, plan: event.plan }
                                            : m
                                    );
                                    onMessagesUpdate(currentMessages);
                                    // Auto-expand
                                    setExpandedPlans(prev => ({ ...prev, [assistantMessageId]: true }));
                                } else if (event.type === "tool_start") {
                                    // Server started an internal tool - show it!
                                    const toolCall: ToolCall = {
                                        id: event.toolCallId || crypto.randomUUID(),
                                        name: event.name,
                                        arguments: JSON.stringify(event.args || {}),
                                        status: "running"
                                    };

                                    // Update visual display on current assistant message
                                    // The streaming message accumulates all internal toolCalls
                                    // and they get sent to the API via the updated serialization
                                    currentMessages = currentMessages.map(m =>
                                        m.id === assistantMessageId
                                            ? { ...m, toolCalls: [...(m.toolCalls || []), toolCall] }
                                            : m
                                    );
                                    onMessagesUpdate(currentMessages);
                                } else if (event.type === "tool_result") {
                                    // Server finished a tool - update visual display
                                    currentMessages = currentMessages.map(m =>
                                        m.id === assistantMessageId
                                            ? {
                                                ...m,
                                                toolCalls: m.toolCalls?.map(tc =>
                                                    tc.id === event.toolCallId
                                                        ? { ...tc, status: "completed", result: event.result }
                                                        : tc
                                                )
                                            }
                                            : m
                                    );
                                    onMessagesUpdate(currentMessages);

                                    // Add a tool-role message to the conversation history
                                    const toolResultMsg: Message = {
                                        id: crypto.randomUUID(),
                                        role: "tool",
                                        content: typeof event.result === 'string' ? event.result : JSON.stringify(event.result),
                                        tool_call_id: event.toolCallId,
                                        name: event.name,
                                    };
                                    currentMessages = [...currentMessages, toolResultMsg];
                                } else if (event.type === "tool_calls") {
                                    streamedToolCalls = event;
                                } else if (event.type === "error") {
                                    accumulatedContent += `\n\nError: ${event.content}`;
                                    currentMessages = currentMessages.map(m =>
                                        m.id === assistantMessageId
                                            ? { ...m, content: accumulatedContent }
                                            : m
                                    );
                                    onMessagesUpdate(currentMessages);
                                }
                                // "done" type — stream is complete, loop will exit on next read
                            } catch {
                                // Skip unparseable lines
                            }
                        }
                    }

                    // Only exit agentic loop if we didn't receive tool calls to execute
                    if (!streamedToolCalls) break;
                }

                // Handle JSON response (tool calls or legacy messages)
                // Use streamed data if available, otherwise fetch JSON
                const data = streamedToolCalls || (contentType.includes("application/json") ? await response.json() : null);

                if (!data) break; // Should not happen usually

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

                        // Helper: complete a tool and add its result to conversation history
                        const completeToolWithResult = (result: string) => {
                            updateToolStatus("completed", result);
                            // Add role:"tool" message so the server sees the result
                            const toolResultMsg: Message = {
                                id: crypto.randomUUID(),
                                role: "tool",
                                content: typeof result === 'string' ? result : JSON.stringify(result),
                                tool_call_id: toolCall.id,
                                name: toolCall.name,
                            };
                            currentMessages = [...currentMessages, toolResultMsg];
                        };

                        try {
                            const args = JSON.parse(toolCall.arguments);

                            // Check if it's a writing tool
                            if (isWritingTool(toolCall.name)) {
                                const result = executeWritingToolLocal(toolCall.name, args);
                                completeToolWithResult(result);
                            } else if (toolCall.name.startsWith("fs_")) {
                                // Check if this targets the currently open file
                                const isCurrentFile = selectedFile && (
                                    args.path === selectedFile.path ||
                                    args.path === selectedFile.name ||
                                    args.path.endsWith(`/${selectedFile.name}`) ||
                                    selectedFile.path?.endsWith(`/${args.path}`) ||
                                    selectedFile.name?.toLowerCase() === args.path?.toLowerCase()
                                );

                                // READ: Always use in-memory content for the active file
                                if (toolCall.name === "fs_read_file" && isCurrentFile) {
                                    console.log("AgentPanel: Reading active file from memory", selectedFile!.name);
                                    const liveContent = editorContentRef.current || "";
                                    completeToolWithResult(liveContent);
                                }
                                // WRITE to active file: update in-memory first, DB sync async
                                else if (toolCall.name === "fs_write_file" && isCurrentFile) {
                                    console.log("AgentPanel: Writing to active file in-memory", selectedFile!.name);
                                    // Update editor content in memory immediately
                                    if (args.content) {
                                        editorContentRef.current = args.content;
                                    }
                                    // Async DB sync (fire and forget)
                                    executeFileSystemTool(workspaceId, toolCall.name, args).catch(
                                        err => console.warn("Async DB sync failed:", err)
                                    );
                                    completeToolWithResult(`Wrote ${args.content?.length || 0} chars to ${selectedFile!.name}`);
                                    onRefreshFiles?.();
                                }
                                // FIX: Handle fs_append_file for active file
                                else if (toolCall.name === "fs_append_file" && isCurrentFile) {
                                    console.log("AgentPanel: Appending to active file in-memory", selectedFile!.name);
                                    if (args.content) {
                                        editorContentRef.current = (editorContentRef.current || "") + "\n" + args.content;
                                    }
                                    executeFileSystemTool(workspaceId, toolCall.name, args).catch(
                                        err => console.warn("Async DB sync failed:", err)
                                    );
                                    completeToolWithResult(`Appended ${args.content?.length || 0} chars to ${selectedFile!.name}`);
                                    onRefreshFiles?.();
                                }
                                else {
                                    // Non-active file: execute server-side as normal
                                    const result = await executeFileSystemTool(workspaceId, toolCall.name, args);
                                    completeToolWithResult(result);

                                    // Refresh sidebar after file creation/write operations
                                    if ((toolCall.name === "fs_write_file" || toolCall.name === "fs_append_file") &&
                                        result && !result.includes("Error")) {
                                        onRefreshFiles?.();
                                    }
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

                                completeToolWithResult(result.result);
                            }
                        } catch (err: any) {
                            updateToolStatus("error", err.message || "Tool execution failed");
                            // Add error result to conversation history too
                            const toolErrorMsg: Message = {
                                id: crypto.randomUUID(),
                                role: "tool",
                                content: `Error: ${err.message || "Tool execution failed"}`,
                                tool_call_id: toolCall.id,
                                name: toolCall.name,
                            };
                            currentMessages = [...currentMessages, toolErrorMsg];
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
    }, [currentFiles, selectedFile, workspaceId, chatSessionId, currentSessionId, shouldStop, onFilesChange, selectedModel]);

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
            // Ensure session exists
            let sessionId = currentSessionId;
            if (!sessionId) {
                const title = input.slice(0, 30) + (input.length > 30 ? "..." : "");
                console.log("[AgentPanel] Creating new session with title:", title);
                sessionId = await createNewSession(title) || undefined;
                console.log("[AgentPanel] New session created. ID:", sessionId);
            } else {
                console.log("[AgentPanel] Using existing session ID:", sessionId);
            }

            if (sessionId) {
                // Save user message
                saveMessageToDb(userMessage, sessionId);

                console.log("[AgentPanel] Starting agentic loop with session ID:", sessionId);
                await runAgenticLoop(newMessages, (updatedMessages) => {
                    setMessages(updatedMessages);
                    // Save assistant message as it updates
                    const lastMsg = updatedMessages[updatedMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant' && sessionId) {
                        // Only save explicitly IF we have content or tool calls 
                        // (though filtering happens further down, this is DB save)
                        saveMessageToDb(lastMsg, sessionId);
                    }
                }, sessionId); // Pass the explicit session ID
            } else {
                // Fallback without persistence if session creation fails
                console.warn("[AgentPanel] Session creation failed or ID missing. Running without persistence.");
                await runAgenticLoop(newMessages, setMessages);
            }
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
        <aside className="w-80 border-l border-gray-200 bg-white flex flex-col flex-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">
                    {view === 'history' ? 'Chat History' : 'Chat'}
                </h2>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
                        className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${view === 'history' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}
                        title="History"
                    >
                        <History className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            setCurrentSessionId(null);
                            setView('chat');
                            setMessages([]);
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                        title="New Chat"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors ml-1"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {view === 'history' ? (
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(session => (
                        <button
                            key={session.id}
                            onClick={() => {
                                setCurrentSessionId(session.id);
                                setView('chat');
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${currentSessionId === session.id
                                ? 'bg-white shadow-sm ring-1 ring-gray-200 text-indigo-600'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{session.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(session.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </button>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No chat history
                        </div>
                    )}
                </div>
            ) : (
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
                                        <div className="max-w-[85%] bg-gray-100 text-gray-900 rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                                            {message.content}
                                        </div>
                                    </div>
                                ) : (
                                    // Assistant message
                                    <div className="space-y-3">
                                        {/* Plan Block */}
                                        {message.plan && (
                                            <div className="mb-3 bg-indigo-50 rounded-lg border border-indigo-100 overflow-hidden text-left">
                                                <button
                                                    onClick={() => togglePlan(message.id)}
                                                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-indigo-100/50 transition-colors"
                                                >
                                                    <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                                        <Target className="w-3 h-3 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <span className="font-semibold text-xs text-indigo-900 truncate block">
                                                            {message.plan.intent}
                                                        </span>
                                                    </div>
                                                    {expandedPlans[message.id] ? <ChevronDown className="w-3 h-3 text-indigo-400" /> : <ChevronRight className="w-3 h-3 text-indigo-400" />}
                                                </button>
                                                {expandedPlans[message.id] && (
                                                    <div className="px-3 py-2 border-t border-indigo-100 text-xs text-indigo-800 bg-indigo-50/50">
                                                        <ol className="list-decimal pl-4 space-y-1">
                                                            {message.plan.steps?.map((step: string, i: number) => (
                                                                <li key={i}>{step}</li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                )}
                                            </div>
                                        )}

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

                    <div className="p-3 bg-white border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            {/* Memory toggle button */}
                            <button
                                onClick={() => setShowMemory(!showMemory)}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${showMemory || agentMemory.length > 0
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

                            {/* Token Usage Indicator */}
                            {selectedFile && (
                                <div className="flex items-center gap-1.5" title="Estimated context usage">
                                    <div className="relative w-4 h-4 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="8"
                                                cy="8"
                                                r="6"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                fill="none"
                                                className="text-gray-100"
                                            />
                                            <circle
                                                cx="8"
                                                cy="8"
                                                r="6"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                fill="none"
                                                className="text-indigo-500 transition-all duration-300"
                                                strokeDasharray={37.7}
                                                strokeDashoffset={37.7 * (1 - Math.min(1, ((editorContent?.length || 0) / 4 + contextFiles.reduce((acc, f) => acc + (f.content?.length || 0) / 4, 0) + messages.reduce((acc, m) => acc + m.content.length / 4, 0) + 1000) / (MODELS.find(m => m.id === selectedModel)?.maxTokens || 200000)))}
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {Math.round(((editorContent?.length || 0) / 4 + contextFiles.reduce((acc, f) => acc + (f.content?.length || 0) / 4, 0) + messages.reduce((acc, m) => acc + m.content.length / 4, 0) + 1000) / 1000)}k / {Math.round((MODELS.find(m => m.id === selectedModel)?.maxTokens || 200000) / 1000)}k
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Context File Chips */}
                        <div className="flex flex-wrap gap-1 mb-2">
                            {/* Active File Chip */}
                            {selectedFile && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs border border-green-100 ring-1 ring-green-200/50" title="Active Document (Automatically included)">
                                    <FileText className="w-3 h-3" />
                                    <span className="truncate max-w-[100px] font-medium">{selectedFile.name}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5 animate-pulse" />
                                </span>
                            )}
                            {/* Other Context Files */}
                            {contextFiles.map(f => (
                                <ContextChip
                                    key={f.id}
                                    file={f}
                                    onRemove={() => handleRemoveContextFile(f.id)}
                                />
                            ))}
                        </div>

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
                                className="w-full resize-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-24 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all min-h-[48px] max-h-[200px] overflow-y-auto"
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
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isWebSearchEnabled
                                            ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                            }`}
                                        title={isWebSearchEnabled ? "Web Search Enabled" : "Web Search Disabled"}
                                    >
                                        <Globe className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!input.trim() || isLoading}
                                        className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                </div>
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


                    {/* Model Selector Footer */}
                    <div className="p-3 border-t border-gray-200 bg-white relative" style={{ overflow: 'visible' }}>
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
                            <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 9999 }}>
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
                </>
            )}
        </aside >
    );
}

// Helper functions
function getToolDisplayName(name: string): string {
    const names: Record<string, string> = {
        "fs_read_file": "Reading document",
        "fs_list_directory": "Browsing files",
        "fs_list_workplace": "Browsing workspace",
        "fs_find_file": "Searching for file",
        "fs_search_content": "Searching file contents",
        "fs_write_file": "Creating document",
        "fs_append_file": "Adding to document",
        "fs_update_file": "Updating document",
        "fs_delete_file": "Deleting file",
        "search_files": "Searching files",
        "web_search": "Searching the web",
        "consult_writer": "Writing content",
        "insert_text": "Inserting into editor",
        "replace_selection": "Replacing selection",
        "suggest_edit": "Suggesting an edit",
        "add_comment": "Adding a note",
        "open_file_in_editor": "Opening in editor",
        "notify_user": "Sending update",
    };
    return names[name] || "Working...";
}

function formatToolArgs(name: string, args: string): string {
    try {
        const parsed = JSON.parse(args);
        switch (name) {
            case "fs_read_file": return parsed.path || parsed.filename || "";
            case "fs_list_directory":
            case "fs_list_workplace": return parsed.path || "/";
            case "fs_find_file": return parsed.pattern || "";
            case "fs_search_content": return `"${parsed.query || ""}"`;
            case "fs_write_file": return parsed.path || "";
            case "fs_append_file": return parsed.path || "";
            case "fs_update_file": return parsed.path || "";
            case "fs_delete_file": return parsed.path || parsed.id || "";
            case "search_files": return `"${parsed.query || ""}"`;
            case "web_search": return `"${parsed.query?.slice(0, 60) || ""}"`;
            case "consult_writer": return parsed.instructions?.slice(0, 80) || parsed.task?.slice(0, 80) || "Drafting content...";
            case "suggest_edit": return parsed.search_text?.slice(0, 50) || "Applying changes";
            case "insert_text": return parsed.text?.slice(0, 50) || "";
            case "add_comment": return parsed.comment?.slice(0, 50) || "";
            case "open_file_in_editor": return parsed.filename || parsed.path || "";
            case "notify_user": return parsed.message?.slice(0, 60) || "";
            default: return "";
        }
    } catch {
        return "";
    }
}
