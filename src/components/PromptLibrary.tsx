'use client';

import { useState, useCallback } from 'react';
import {
    Sparkles,
    FileText,
    PenLine,
    List,
    MessageSquare,
    Lightbulb,
    Zap,
    Search,
    Plus,
    Star,
    Copy,
    Check
} from 'lucide-react';

// ============ Prompt Template ============
export interface PromptTemplate {
    id: string;
    title: string;
    description: string;
    category: 'writing' | 'analysis' | 'brainstorm' | 'code' | 'custom';
    prompt: string;
    variables?: string[]; // Placeholders like {{topic}}, {{context}}
    icon: React.ReactNode;
    isFavorite?: boolean;
}

// ============ Default Prompt Library ============
export const defaultPrompts: PromptTemplate[] = [
    // Writing
    {
        id: 'blog-post',
        title: 'Blog Post Draft',
        description: 'Create a structured blog post outline',
        category: 'writing',
        icon: <FileText className="w-4 h-4" />,
        prompt: `Write a blog post about {{topic}}. 

Include:
- An engaging introduction
- 3-5 main sections with headers
- Practical examples or tips
- A compelling conclusion with a call to action

Tone: Professional but approachable
Length: Approximately 800-1200 words`,
        variables: ['topic'],
    },
    {
        id: 'email-professional',
        title: 'Professional Email',
        description: 'Draft a polished business email',
        category: 'writing',
        icon: <MessageSquare className="w-4 h-4" />,
        prompt: `Write a professional email about {{subject}}.

Context: {{context}}

Requirements:
- Clear subject line suggestion
- Professional greeting
- Concise body (3-4 paragraphs max)
- Clear call to action
- Professional sign-off`,
        variables: ['subject', 'context'],
    },
    {
        id: 'meeting-summary',
        title: 'Meeting Summary',
        description: 'Summarize meeting notes into action items',
        category: 'writing',
        icon: <PenLine className="w-4 h-4" />,
        prompt: `Summarize the following meeting notes into a clear, actionable format:

{{notes}}

Please provide:
1. Key decisions made
2. Action items with owners (if mentioned)
3. Follow-up topics for next meeting
4. Any blockers or risks discussed`,
        variables: ['notes'],
    },

    // Analysis
    {
        id: 'swot-analysis',
        title: 'SWOT Analysis',
        description: 'Analyze strengths, weaknesses, opportunities, threats',
        category: 'analysis',
        icon: <List className="w-4 h-4" />,
        prompt: `Perform a SWOT analysis for: {{subject}}

Context: {{context}}

Provide a detailed analysis of:
- **Strengths**: Internal advantages
- **Weaknesses**: Internal limitations
- **Opportunities**: External factors to leverage
- **Threats**: External risks to address

Include specific, actionable insights for each category.`,
        variables: ['subject', 'context'],
    },
    {
        id: 'competitive-analysis',
        title: 'Competitive Analysis',
        description: 'Compare against competitors',
        category: 'analysis',
        icon: <Search className="w-4 h-4" />,
        prompt: `Analyze {{product}} against these competitors: {{competitors}}

Compare across:
1. Feature set and capabilities
2. Pricing and positioning
3. Target audience
4. Unique value propositions
5. Market perception

Conclude with strategic recommendations.`,
        variables: ['product', 'competitors'],
    },

    // Brainstorm
    {
        id: 'feature-ideas',
        title: 'Feature Brainstorm',
        description: 'Generate product feature ideas',
        category: 'brainstorm',
        icon: <Lightbulb className="w-4 h-4" />,
        prompt: `Brainstorm feature ideas for: {{product}}

Target users: {{users}}
Current pain points: {{pain_points}}

Generate 10 creative feature ideas that:
- Address the pain points
- Delight users
- Are technically feasible
- Provide competitive advantage

For each idea, include: Name, Description, User Benefit, Implementation Complexity (Low/Medium/High)`,
        variables: ['product', 'users', 'pain_points'],
    },
    {
        id: 'user-story-generator',
        title: 'User Story Generator',
        description: 'Create user stories from requirements',
        category: 'brainstorm',
        icon: <Sparkles className="w-4 h-4" />,
        prompt: `Convert the following requirements into user stories:

{{requirements}}

Format each story as:
"As a [user type], I want to [action] so that [benefit]"

Include:
- Acceptance criteria for each story
- Story point estimate (1, 2, 3, 5, 8, 13)
- Priority (Must Have / Should Have / Nice to Have)`,
        variables: ['requirements'],
    },

    // Code
    {
        id: 'code-review',
        title: 'Code Review',
        description: 'Review code for issues and improvements',
        category: 'code',
        icon: <Zap className="w-4 h-4" />,
        prompt: `Review the following code:

\`\`\`
{{code}}
\`\`\`

Please analyze for:
1. Bugs or logical errors
2. Performance issues
3. Security vulnerabilities
4. Code style and best practices
5. Potential edge cases

Provide specific suggestions for improvement with code examples.`,
        variables: ['code'],
    },
];

// ============ Prompt Library Panel ============
interface PromptLibraryProps {
    prompts?: PromptTemplate[];
    onSelect: (prompt: PromptTemplate) => void;
    onCreateNew?: () => void;
}

export function PromptLibrary({
    prompts = defaultPrompts,
    onSelect,
    onCreateNew
}: PromptLibraryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const categories = [
        { id: null, label: 'All', icon: <Sparkles className="w-3 h-3" /> },
        { id: 'writing', label: 'Writing', icon: <PenLine className="w-3 h-3" /> },
        { id: 'analysis', label: 'Analysis', icon: <List className="w-3 h-3" /> },
        { id: 'brainstorm', label: 'Brainstorm', icon: <Lightbulb className="w-3 h-3" /> },
        { id: 'code', label: 'Code', icon: <Zap className="w-3 h-3" /> },
    ];

    const filteredPrompts = prompts.filter(p => {
        const matchesCategory = !selectedCategory || p.category === selectedCategory;
        const matchesSearch = !searchQuery ||
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="h-full flex flex-col bg-[#252526]">
            {/* Search */}
            <div className="p-3 border-b border-[#3c3c3c]">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search prompts..."
                        className="w-full pl-8 pr-3 py-1.5 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc]"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-1 px-3 py-2 border-b border-[#3c3c3c] overflow-x-auto">
                {categories.map(cat => (
                    <button
                        key={cat.id ?? 'all'}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                ? 'bg-[#007acc] text-white'
                                : 'bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4c4c4c]'
                            }`}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Prompt List */}
            <div className="flex-1 overflow-y-auto p-2">
                {filteredPrompts.map(prompt => (
                    <button
                        key={prompt.id}
                        onClick={() => onSelect(prompt)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-[#3c3c3c] text-left mb-1"
                    >
                        <div className="p-2 bg-[#1e1e1e] rounded-md text-[#007acc] flex-shrink-0">
                            {prompt.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm text-[#cccccc] font-medium">{prompt.title}</span>
                                {prompt.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-current" />}
                            </div>
                            <p className="text-xs text-[#858585] mt-0.5 line-clamp-2">{prompt.description}</p>
                            {prompt.variables && prompt.variables.length > 0 && (
                                <div className="flex gap-1 mt-1.5">
                                    {prompt.variables.map(v => (
                                        <span key={v} className="text-[10px] px-1.5 py-0.5 bg-[#1e1e1e] text-[#858585] rounded">
                                            {`{{${v}}}`}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </button>
                ))}

                {filteredPrompts.length === 0 && (
                    <div className="text-center py-8 text-xs text-[#858585]">
                        No prompts found
                    </div>
                )}
            </div>

            {/* Create New */}
            {onCreateNew && (
                <div className="p-2 border-t border-[#3c3c3c]">
                    <button
                        onClick={onCreateNew}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#858585] hover:text-[#cccccc] hover:bg-[#3c3c3c] rounded"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Create Custom Prompt
                    </button>
                </div>
            )}
        </div>
    );
}

// ============ Prompt Editor Dialog ============
interface PromptEditorProps {
    prompt: PromptTemplate | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (filledPrompt: string) => void;
}

export function PromptEditor({ prompt, isOpen, onClose, onSubmit }: PromptEditorProps) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState(false);

    if (!isOpen || !prompt) return null;

    const filledPrompt = prompt.prompt.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(filledPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#1e1e1e] rounded-md text-[#007acc]">
                            {prompt.icon}
                        </div>
                        <div>
                            <h2 className="text-[#cccccc] font-medium">{prompt.title}</h2>
                            <p className="text-xs text-[#858585]">{prompt.description}</p>
                        </div>
                    </div>
                </div>

                {/* Variables */}
                {prompt.variables && prompt.variables.length > 0 && (
                    <div className="p-4 border-b border-[#3c3c3c]">
                        <div className="text-xs text-[#858585] mb-3">Fill in the variables:</div>
                        <div className="space-y-3">
                            {prompt.variables.map(varName => (
                                <div key={varName}>
                                    <label className="text-xs text-[#cccccc] mb-1 block">{`{{${varName}}}`}</label>
                                    <input
                                        type="text"
                                        value={values[varName] || ''}
                                        onChange={(e) => setValues(v => ({ ...v, [varName]: e.target.value }))}
                                        placeholder={`Enter ${varName}...`}
                                        className="w-full px-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-sm text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc]"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Preview */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#858585]">Preview</span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs text-[#858585] hover:text-[#cccccc]"
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <pre className="text-xs text-[#cccccc] whitespace-pre-wrap font-mono bg-[#1e1e1e] p-4 rounded-lg">
                        {filledPrompt}
                    </pre>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3c3c3c]">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(filledPrompt)}
                        className="px-4 py-1.5 text-xs bg-[#007acc] hover:bg-[#1a85dc] text-white rounded"
                    >
                        Use Prompt
                    </button>
                </div>
            </div>
        </div>
    );
}
