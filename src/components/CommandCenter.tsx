"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User, History, X, ArrowUp, Code, FileText, Loader2, Check, Hash, Search, ListTodo } from "lucide-react";
import type { FileNode } from "@/lib/types";
import { executeTool, TOOL_DEFINITIONS } from "@/lib/client-tools";

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
    status: "running" | "completed" | "requires_action" | "rejected";
    description: string;
    args: any;
}

interface CommandCenterProps {
    currentFile: FileNode | null;
    onFileUpdate: (content: string) => void;
    files: FileNode[];
    onFilesChange: (files: FileNode[]) => void;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
    fs_read_file: <FileText className="w-3.5 h-3.5" />,
    fs_write_file: <FileText className="w-3.5 h-3.5" />,
    fs_list_files: <Code className="w-3.5 h-3.5" />,
    fs_patch_file: <Code className="w-3.5 h-3.5" />,
    slack_read_channel: <Hash className="w-3.5 h-3.5" />,
    tracker_get_issues: <ListTodo className="w-3.5 h-3.5" />,
    web_search: <Search className="w-3.5 h-3.5" />,
};

const TOOL_LABELS: Record<string, string> = {
    fs_read_file: "Reading file...",
    fs_write_file: "Writing file...",
    fs_list_files: "Listing files...",
    fs_patch_file: "Patching file...",
    slack_read_channel: "Reading Slack...",
    tracker_get_issues: "Getting issues...",
    web_search: "Searching web...",
};

const MODELS = [
    { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
    { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
    { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
    { id: "moonshotai/kimi-k2-thinking", name: "Kimi k2 Thinking" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash" },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek v3.2" },
    { id: "minimax/minimax-m2.1", name: "Minimax M2.1" },
];

export function CommandCenter({ currentFile, onFileUpdate, files, onFilesChange }: CommandCenterProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "I'm your AI assistant. I can help you with:\n\n• Reading and updating documents\n• Gathering feedback from Slack\n• Checking issue trackers\n• Researching topics on the web\n\nTry: \"Read the PRD and suggest improvements\"",
        },
    ]);
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleApproveTool = async (messageId: string, toolId: string) => {
        setIsLoading(true);
        // Find the message and update tool status to 'running' (optimistic UI)
        setMessages(prev => prev.map(m => {
            if (m.id === messageId && m.toolCalls) {
                return {
                    ...m,
                    toolCalls: m.toolCalls.map(t => t.id === toolId ? { ...t, status: "running" } : t)
                };
            }
            return m;
        }));

        try {
            await processChatRequest(messages.map(m => {
                if (m.id === messageId) {
                    return m;
                }
                return m;
            }));
        } catch (error) {
            console.error("Tool execution failed", error);
            setIsLoading(false);
        }
    };

    const processChatRequest = async (messagesPayload: Message[], toolResults?: Array<{ toolCallId: string, result: string, toolName: string, args: any }>) => {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: messagesPayload.map((m) => ({
                    role: m.role,
                    content: m.content || "",
                    tool_call_id: m.tool_call_id,
                })),
                model: selectedModel,
                toolResults,
            }),
        });

        if (!response.ok) throw new Error("Failed to get response");

        const data = await response.json();
        const assistantMessageId = (Date.now() + 1).toString();

        if (data.type === "tool_calls") {
            // LLM wants to use tools - execute them client-side
            const toolCalls: ToolCall[] = data.toolCalls.map((tc: any) => ({
                id: tc.id,
                name: tc.name,
                status: "running" as const,
                description: TOOL_LABELS[tc.name] || tc.name,
                args: tc.args
            }));

            // Add assistant message with tool calls
            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: "assistant",
                content: data.content || "",
                toolCalls
            }]);

            // Execute each tool locally
            const results: Array<{ toolCallId: string, result: string, toolName: string, args: any }> = [];
            let currentFiles = files;

            for (const tc of data.toolCalls) {
                const toolResult = executeTool(currentFiles, tc.name, tc.args);
                results.push({
                    toolCallId: tc.id,
                    result: toolResult.result,
                    toolName: tc.name,
                    args: tc.args
                });

                // Update files if tool modified them
                if (toolResult.updatedFiles) {
                    currentFiles = toolResult.updatedFiles;
                    onFilesChange(currentFiles);
                }
            }

            // Update tool statuses to completed
            setMessages(prev => prev.map(m => {
                if (m.id === assistantMessageId) {
                    return {
                        ...m,
                        toolCalls: m.toolCalls?.map(tc => ({ ...tc, status: "completed" as const }))
                    };
                }
                return m;
            }));

            // Send results back to LLM for final response
            await processChatRequest(messagesPayload, results);
        } else if (data.type === "message") {
            // Final response from LLM
            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: "assistant",
                content: data.content
            }]);
            setIsLoading(false);
        } else if (data.type === "error") {
            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: "assistant",
                content: data.content
            }]);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            await processChatRequest(newMessages);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Error: Please configure your API keys in `.env.local`.",
            };
            setMessages((prev) => [...prev, errorMessage]);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <aside className="w-[320px] flex-none flex flex-col border-l border-[#3c3c3c] bg-[#252526]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c] bg-[#323233]">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#0078d4]" />
                    <span className="text-[#cccccc] text-[13px] font-medium">Copilot</span>
                </div>
                <div className="flex gap-1">
                    <History className="w-4 h-4 text-[#858585] hover:text-[#cccccc] cursor-pointer" />
                    <X className="w-4 h-4 text-[#858585] hover:text-[#cccccc] cursor-pointer" />
                </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.filter(m => m.role !== 'tool').map((message) => (
                    <div key={message.id} className={`flex flex-col gap-1.5 ${message.role === "user" ? "items-end" : ""}`}>
                        <div className={`flex items-center gap-1.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                            <div className={`size-5 rounded flex items-center justify-center ${message.role === "user" ? "bg-[#0078d4]/20 text-[#0078d4]" : "bg-[#6a9955]/20 text-[#6a9955]"
                                }`}>
                                {message.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                            </div>
                            <span className="text-[11px] text-[#858585]">{message.role === "user" ? "You" : "Copilot"}</span>
                        </div>

                        {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className={`${message.role === "user" ? "mr-6" : "ml-6"} space-y-2`}>
                                {message.toolCalls.map((tool) => (
                                    <div key={tool.id} className="flex flex-col gap-2 px-3 py-2 bg-[#37373d] rounded text-[12px] text-[#cccccc] border border-[#454545]">
                                        <div className="flex items-center gap-2">
                                            {tool.status === "completed" ? (
                                                <Check className="w-3.5 h-3.5 text-[#6a9955]" />
                                            ) : (
                                                <div className="size-3.5 rounded-full border-2 border-[#0078d4] border-t-transparent animate-spin" />
                                            )}
                                            {TOOL_ICONS[tool.name] || <Code className="w-3.5 h-3.5" />}
                                            <span className="font-medium">{tool.name}</span>
                                        </div>

                                        <div className="text-[#858585] font-mono text-[11px] bg-[#252526] p-1.5 rounded">
                                            {JSON.stringify(tool.args)}
                                        </div>

                                        {tool.status === "requires_action" && (
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    onClick={() => handleApproveTool(message.id, tool.id)}
                                                    className="px-3 py-1 bg-[#0078d4] hover:bg-[#1a85dc] text-white rounded text-[11px] transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#454545] text-[#cccccc] rounded text-[11px] transition-colors">
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {tool.status === "completed" && (
                                            <div className="text-[#6a9955] text-[10px]">Completed</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={`${message.role === "user" ? "mr-6" : "ml-6"} px-3 py-2 rounded text-[13px] leading-relaxed ${message.role === "user"
                            ? "bg-[#0078d4] text-white rounded-br-none"
                            : "bg-[#37373d] text-[#cccccc] rounded-bl-none"
                            }`}>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <div className="size-5 rounded bg-[#6a9955]/20 flex items-center justify-center text-[#6a9955]">
                                <Bot className="w-3 h-3" />
                            </div>
                            <span className="text-[11px] text-[#858585]">Copilot</span>
                        </div>
                        <div className="ml-6 px-3 py-2 bg-[#37373d] rounded rounded-bl-none">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-[#0078d4] rounded-full animate-pulse"></span>
                                <span className="w-1.5 h-1.5 bg-[#0078d4] rounded-full animate-pulse" style={{ animationDelay: "150ms" }}></span>
                                <span className="w-1.5 h-1.5 bg-[#0078d4] rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[#3c3c3c]">
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        <textarea
                            className="w-full bg-[#3c3c3c] border border-[#3c3c3c] rounded pl-3 pr-10 py-2 text-[13px] text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0078d4] resize-none h-[70px]"
                            placeholder="Ask Copilot..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            type="submit"
                            className="absolute bottom-2 right-2 p-1.5 bg-[#0078d4] hover:bg-[#1a85dc] rounded text-white transition-colors disabled:opacity-50"
                            disabled={isLoading || !input.trim()}
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </form>
                <div className="flex items-center justify-between mt-1.5 px-1">
                    <div className="flex gap-2 text-[10px] text-[#858585]">
                        {currentFile && (
                            <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {currentFile.name}
                            </span>
                        )}
                    </div>
                    <select
                        className="bg-transparent text-[10px] text-[#858585] border-none outline-none cursor-pointer hover:text-[#cccccc]"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                    >
                        {MODELS.map((model) => (
                            <option key={model.id} value={model.id} className="bg-[#252526] text-[#cccccc]">
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </aside>
    );
}
