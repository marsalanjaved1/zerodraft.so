'use client';

import { useState, useCallback } from 'react';
import {
    Wand2,
    Sparkles,
    ArrowRight,
    RefreshCw,
    Check,
    X,
    Loader2,
    Type,
    FileText,
    Zap,
    MessageSquare
} from 'lucide-react';

// ============ Inline AI Actions ============
export interface InlineAIAction {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    prompt: (text: string) => string;
}

export const defaultInlineActions: InlineAIAction[] = [
    {
        id: 'improve',
        label: 'Improve Writing',
        description: 'Enhance clarity and flow',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        prompt: (text) => `Improve the following text to be clearer, more professional, and better structured. Keep the same meaning and tone:\n\n${text}`,
    },
    {
        id: 'shorten',
        label: 'Make Shorter',
        description: 'Condense without losing meaning',
        icon: <Zap className="w-3.5 h-3.5" />,
        prompt: (text) => `Make the following text more concise while preserving all key information:\n\n${text}`,
    },
    {
        id: 'expand',
        label: 'Expand',
        description: 'Add more detail and depth',
        icon: <FileText className="w-3.5 h-3.5" />,
        prompt: (text) => `Expand the following text with more detail, examples, and explanation while keeping the same style:\n\n${text}`,
    },
    {
        id: 'simplify',
        label: 'Simplify',
        description: 'Make easier to understand',
        icon: <Type className="w-3.5 h-3.5" />,
        prompt: (text) => `Simplify the following text to make it easier to understand. Use simpler words and shorter sentences:\n\n${text}`,
    },
    {
        id: 'formal',
        label: 'More Formal',
        description: 'Professional tone',
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        prompt: (text) => `Rewrite the following text in a more formal, professional tone suitable for business communication:\n\n${text}`,
    },
    {
        id: 'casual',
        label: 'More Casual',
        description: 'Friendly, conversational',
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        prompt: (text) => `Rewrite the following text in a more casual, friendly, and conversational tone:\n\n${text}`,
    },
];

// ============ Inline AI Menu ============
interface InlineAIMenuProps {
    position: { x: number; y: number };
    selectedText: string;
    onAction: (action: InlineAIAction) => void;
    onCustomPrompt: (prompt: string) => void;
    onClose: () => void;
    isLoading?: boolean;
}

export function InlineAIMenu({
    position,
    selectedText,
    onAction,
    onCustomPrompt,
    onClose,
    isLoading = false,
}: InlineAIMenuProps) {
    const [customPrompt, setCustomPrompt] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    return (
        <div
            className="fixed z-50 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-64 overflow-hidden"
            style={{ left: position.x, top: position.y }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c]">
                <div className="flex items-center gap-2 text-xs text-[#cccccc]">
                    <Wand2 className="w-3.5 h-3.5 text-[#007acc]" />
                    <span>AI Actions</span>
                </div>
                <button onClick={onClose} className="p-0.5 hover:bg-[#3c3c3c] rounded">
                    <X className="w-3.5 h-3.5 text-[#858585]" />
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-[#cccccc]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Generating...</span>
                </div>
            ) : showCustom ? (
                <div className="p-2">
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Enter custom instructions..."
                        className="w-full h-20 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#cccccc] placeholder-[#858585] resize-none focus:outline-none focus:border-[#007acc]"
                        autoFocus
                    />
                    <div className="flex gap-1.5 mt-2">
                        <button
                            onClick={() => setShowCustom(false)}
                            className="flex-1 px-2 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => onCustomPrompt(customPrompt)}
                            disabled={!customPrompt.trim()}
                            className="flex-1 px-2 py-1 text-xs bg-[#007acc] hover:bg-[#1a85dc] text-white rounded disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Quick Actions */}
                    <div className="p-1.5">
                        {defaultInlineActions.map((action) => (
                            <button
                                key={action.id}
                                onClick={() => onAction(action)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-[#3c3c3c] text-left"
                            >
                                <span className="text-[#007acc]">{action.icon}</span>
                                <div className="flex-1">
                                    <div className="text-xs text-[#cccccc]">{action.label}</div>
                                    <div className="text-[10px] text-[#858585]">{action.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Custom Prompt */}
                    <div className="border-t border-[#3c3c3c] p-1.5">
                        <button
                            onClick={() => setShowCustom(true)}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-[#3c3c3c] text-left"
                        >
                            <ArrowRight className="w-3.5 h-3.5 text-[#858585]" />
                            <span className="text-xs text-[#858585]">Custom instruction...</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ============ Inline AI Result Preview ============
interface InlineAIResultProps {
    original: string;
    result: string;
    onAccept: () => void;
    onReject: () => void;
    onRegenerate: () => void;
    isRegenerating?: boolean;
}

export function InlineAIResult({
    original,
    result,
    onAccept,
    onReject,
    onRegenerate,
    isRegenerating = false,
}: InlineAIResultProps) {
    const [showDiff, setShowDiff] = useState(false);

    return (
        <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-96 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c]">
                <div className="flex items-center gap-2 text-xs text-[#cccccc]">
                    <Sparkles className="w-3.5 h-3.5 text-[#007acc]" />
                    <span>AI Suggestion</span>
                </div>
                <button
                    onClick={() => setShowDiff(!showDiff)}
                    className={`text-[10px] px-2 py-0.5 rounded ${showDiff ? 'bg-[#3c3c3c] text-[#cccccc]' : 'text-[#858585] hover:text-[#cccccc]'}`}
                >
                    {showDiff ? 'Hide Diff' : 'Show Diff'}
                </button>
            </div>

            {/* Content */}
            <div className="p-3 max-h-60 overflow-y-auto">
                {showDiff ? (
                    <div className="space-y-2">
                        <div className="p-2 bg-[#3c1f1f] rounded text-xs text-[#f48771] line-through">
                            {original}
                        </div>
                        <div className="p-2 bg-[#1f3c1f] rounded text-xs text-[#89d185]">
                            {result}
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-[#cccccc] whitespace-pre-wrap">
                        {result}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-2 border-t border-[#3c3c3c]">
                <button
                    onClick={onReject}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded"
                >
                    <X className="w-3 h-3" />
                    Reject
                </button>
                <button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded disabled:opacity-50"
                >
                    <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                </button>
                <button
                    onClick={onAccept}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-[#007acc] hover:bg-[#1a85dc] text-white rounded"
                >
                    <Check className="w-3 h-3" />
                    Accept
                </button>
            </div>
        </div>
    );
}
