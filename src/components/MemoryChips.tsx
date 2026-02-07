"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Target, Users, MessageSquare, AlertTriangle } from "lucide-react";

interface MemoryItem {
    id: string;
    type: "goal" | "audience" | "tone" | "constraint";
    value: string;
}

interface MemoryChipsProps {
    documentId?: string;
    onMemoryChange?: (memory: MemoryItem[]) => void;
    initialMemory?: MemoryItem[];
}

const MEMORY_TYPES = [
    { type: "goal" as const, label: "Goal", icon: Target, color: "indigo", placeholder: "e.g., Persuade readers to adopt our solution" },
    { type: "audience" as const, label: "Audience", icon: Users, color: "blue", placeholder: "e.g., Technical decision makers" },
    { type: "tone" as const, label: "Tone", icon: MessageSquare, color: "green", placeholder: "e.g., Professional but approachable" },
    { type: "constraint" as const, label: "Constraint", icon: AlertTriangle, color: "orange", placeholder: "e.g., Keep under 2000 words" },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; hoverBg: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", hoverBg: "hover:bg-indigo-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", hoverBg: "hover:bg-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", hoverBg: "hover:bg-green-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", hoverBg: "hover:bg-orange-100" },
};

export function MemoryChips({ documentId, onMemoryChange, initialMemory = [] }: MemoryChipsProps) {
    const [memory, setMemory] = useState<MemoryItem[]>(initialMemory);
    const [isAdding, setIsAdding] = useState<string | null>(null);
    const [newValue, setNewValue] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    // Sync with parent
    useEffect(() => {
        if (onMemoryChange) {
            onMemoryChange(memory);
        }
    }, [memory, onMemoryChange]);

    const addMemory = useCallback((type: MemoryItem["type"], value: string) => {
        if (!value.trim()) return;
        const newItem: MemoryItem = {
            id: crypto.randomUUID(),
            type,
            value: value.trim()
        };
        setMemory(prev => [...prev, newItem]);
        setIsAdding(null);
        setNewValue("");
    }, []);

    const removeMemory = useCallback((id: string) => {
        setMemory(prev => prev.filter(m => m.id !== id));
    }, []);

    const updateMemory = useCallback((id: string, value: string) => {
        if (!value.trim()) {
            removeMemory(id);
            return;
        }
        setMemory(prev => prev.map(m => m.id === id ? { ...m, value: value.trim() } : m));
        setEditingId(null);
        setEditValue("");
    }, [removeMemory]);

    const startEditing = (item: MemoryItem) => {
        setEditingId(item.id);
        setEditValue(item.value);
    };

    return (
        <div className="p-3 space-y-3">
            {/* Section by type */}
            {MEMORY_TYPES.map(({ type, label, icon: Icon, color, placeholder }) => {
                const items = memory.filter(m => m.type === type);
                const colors = COLOR_MAP[color];

                return (
                    <div key={type} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                            <span className="text-xs font-medium text-gray-600">{label}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {items.map(item => (
                                editingId === item.id ? (
                                    <input
                                        key={item.id}
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => updateMemory(item.id, editValue)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") updateMemory(item.id, editValue);
                                            if (e.key === "Escape") setEditingId(null);
                                        }}
                                        className={`text-xs px-2 py-1 rounded-md border ${colors.border} ${colors.bg} outline-none focus:ring-1 focus:ring-indigo-400`}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        key={item.id}
                                        className={`group flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${colors.border} ${colors.bg} ${colors.hoverBg} ${colors.text} cursor-pointer transition-colors`}
                                        onClick={() => startEditing(item)}
                                    >
                                        <span>{item.value}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeMemory(item.id); }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )
                            ))}

                            {/* Add new chip */}
                            {isAdding === type ? (
                                <input
                                    type="text"
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    onBlur={() => { addMemory(type, newValue); }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") addMemory(type, newValue);
                                        if (e.key === "Escape") { setIsAdding(null); setNewValue(""); }
                                    }}
                                    placeholder={placeholder}
                                    className={`text-xs px-2 py-1 rounded-md border ${colors.border} bg-white outline-none focus:ring-1 focus:ring-indigo-400 min-w-[150px]`}
                                    autoFocus
                                />
                            ) : (
                                <button
                                    onClick={() => setIsAdding(type)}
                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed ${colors.border} ${colors.text} opacity-60 hover:opacity-100 transition-opacity`}
                                >
                                    <Plus className="w-3 h-3" />
                                    Add
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Summary for AI */}
            {memory.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400">
                        {memory.length} context item{memory.length > 1 ? "s" : ""} for AI
                    </p>
                </div>
            )}
        </div>
    );
}

// Helper to format memory for system prompt
export function formatMemoryForPrompt(memory: MemoryItem[]): string {
    if (memory.length === 0) return "";

    const sections = {
        goal: memory.filter(m => m.type === "goal").map(m => m.value),
        audience: memory.filter(m => m.type === "audience").map(m => m.value),
        tone: memory.filter(m => m.type === "tone").map(m => m.value),
        constraint: memory.filter(m => m.type === "constraint").map(m => m.value),
    };

    let prompt = "\n\n## Writing Context (User-Defined)\n";

    if (sections.goal.length > 0) {
        prompt += `\n**Goal:** ${sections.goal.join(", ")}`;
    }
    if (sections.audience.length > 0) {
        prompt += `\n**Target Audience:** ${sections.audience.join(", ")}`;
    }
    if (sections.tone.length > 0) {
        prompt += `\n**Tone/Voice:** ${sections.tone.join(", ")}`;
    }
    if (sections.constraint.length > 0) {
        prompt += `\n**Constraints:** ${sections.constraint.join("; ")}`;
    }

    return prompt;
}
