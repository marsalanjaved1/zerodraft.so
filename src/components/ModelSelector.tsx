'use client';

import { useState } from 'react';
import {
    Check,
    ChevronDown,
    Sparkles,
    Zap,
    Brain,
    Bot
} from 'lucide-react';

// ============ AI Model Definition ============
export interface AIModel {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'openrouter' | 'local';
    description: string;
    icon: React.ReactNode;
    capabilities: ('chat' | 'code' | 'vision' | 'fast')[];
    contextLength: number;
    costTier: 'free' | 'low' | 'medium' | 'high';
}

// ============ Available Models ============
export const availableModels: AIModel[] = [
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Most capable OpenAI model',
        icon: <Sparkles className="w-4 h-4" />,
        capabilities: ['chat', 'code', 'vision'],
        contextLength: 128000,
        costTier: 'high',
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast and affordable',
        icon: <Zap className="w-4 h-4" />,
        capabilities: ['chat', 'code', 'fast'],
        contextLength: 128000,
        costTier: 'low',
    },
    {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        description: 'Best for complex reasoning',
        icon: <Brain className="w-4 h-4" />,
        capabilities: ['chat', 'code', 'vision'],
        contextLength: 200000,
        costTier: 'medium',
    },
    {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        description: 'Fast and efficient',
        icon: <Zap className="w-4 h-4" />,
        capabilities: ['chat', 'code', 'fast'],
        contextLength: 200000,
        costTier: 'low',
    },
    {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        provider: 'openrouter',
        description: 'Great for coding tasks',
        icon: <Bot className="w-4 h-4" />,
        capabilities: ['chat', 'code', 'fast'],
        contextLength: 128000,
        costTier: 'low',
    },
    {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        provider: 'openrouter',
        description: 'Open source powerhouse',
        icon: <Bot className="w-4 h-4" />,
        capabilities: ['chat', 'code'],
        contextLength: 128000,
        costTier: 'low',
    },
];

// ============ Model Selector Component ============
interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    models?: AIModel[];
    compact?: boolean;
}

export function ModelSelector({
    selectedModel,
    onModelChange,
    models = availableModels,
    compact = false
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const currentModel = models.find(m => m.id === selectedModel) || models[0];

    const getCostBadge = (tier: AIModel['costTier']) => {
        const colors = {
            free: 'bg-green-900/30 text-green-400',
            low: 'bg-blue-900/30 text-blue-400',
            medium: 'bg-yellow-900/30 text-yellow-400',
            high: 'bg-red-900/30 text-red-400',
        };
        const labels = { free: 'Free', low: '$', medium: '$$', high: '$$$' };
        return (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${colors[tier]}`}>
                {labels[tier]}
            </span>
        );
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1.5'
                    }`}
            >
                <span className="text-[#007acc]">{currentModel.icon}</span>
                <span className={`text-[#cccccc] ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {currentModel.name}
                </span>
                <ChevronDown className={`text-[#858585] ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-72 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-[#3c3c3c]">
                            <span className="text-xs text-[#858585]">Select Model</span>
                        </div>

                        {/* Model List */}
                        <div className="max-h-80 overflow-y-auto py-1">
                            {models.map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onModelChange(model.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#3c3c3c] text-left"
                                >
                                    <span className="text-[#007acc] mt-0.5">{model.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[#cccccc]">{model.name}</span>
                                            {getCostBadge(model.costTier)}
                                            {model.id === selectedModel && (
                                                <Check className="w-3.5 h-3.5 text-[#007acc] ml-auto" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[#858585] mt-0.5">{model.description}</p>
                                        <div className="flex gap-1 mt-1">
                                            {model.capabilities.map(cap => (
                                                <span
                                                    key={cap}
                                                    className="text-[9px] px-1 py-0.5 bg-[#1e1e1e] text-[#858585] rounded"
                                                >
                                                    {cap}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 border-t border-[#3c3c3c]">
                            <div className="text-[10px] text-[#858585]">
                                Context: {(currentModel.contextLength / 1000).toFixed(0)}k tokens
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ============ Model Provider Badge ============
interface ProviderBadgeProps {
    provider: AIModel['provider'];
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
    const config = {
        openai: { label: 'OpenAI', color: 'bg-green-900/30 text-green-400' },
        anthropic: { label: 'Anthropic', color: 'bg-orange-900/30 text-orange-400' },
        openrouter: { label: 'OpenRouter', color: 'bg-purple-900/30 text-purple-400' },
        local: { label: 'Local', color: 'bg-blue-900/30 text-blue-400' },
    };

    const { label, color } = config[provider];

    return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${color}`}>
            {label}
        </span>
    );
}
