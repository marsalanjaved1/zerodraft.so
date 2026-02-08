"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {

    Bot,
    Check,
    ChevronDown,
    ChevronRight,
    FileText,
    History,
    Loader2,
    Menu,
    Plus,
    Search,
    Send,
    Settings,
    Share2,
    Sparkles,
    RotateCcw,
    Megaphone,
    PieChart,
    Scale,
    Shield, // Assuming Shield is used for Security
    Briefcase // Assuming Briefcase is used for PM
} from "lucide-react";


// --- Types ---

type FileSystemItem = {
    id: string;
    name: string;
    type: "file" | "folder";
    children?: FileSystemItem[];
    isOpen?: boolean;
};

type ContentBlock = {
    type: 'h1' | 'h2' | 'p' | 'ul' | 'table';
    content: string;
};

type ChatMessage = {
    role: "user" | "assistant";
    content?: string;
    toolCall?: {
        id: string;
        name: string;
        args: string;
        status: "running" | "completed";
        result?: string;
    };
};

type AnimationStep = "idle" | "typing_prompt" | "processing" | "generating" | "complete";

type ScenarioId = 'pm' | 'marketing' | 'finance' | 'legal' | 'rfp';

interface Scenario {
    id: ScenarioId;
    name: string;
    icon: React.ElementType;
    description: string;
    initialFileId: string;
    files: FileSystemItem[];
    initialBlocks: ContentBlock[];
    promptText: string;
    toolCall: {
        name: string;
        args: object;
        resultSummary: string;
    };
    newFile: {
        folderName: string;
        fileName: string;
        fileId: string;
    };
    generatedBlocks: ContentBlock[];
    completionText: string;
}

// --- Scenarios Data ---

const PM_SCENARIO: Scenario = {
    id: 'pm',
    name: 'Product Manager',
    icon: Briefcase,
    description: 'Generate PRD from notes',
    initialFileId: 'notes',
    files: [
        {
            id: 'root', name: 'process_notes', type: 'folder', isOpen: true, children: [
                { id: 'notes', name: 'meeting_notes.md', type: 'file' },
                { id: 'roadmap', name: 'Q3_Roadmap.xlsx', type: 'file' }
            ]
        },
        {
            id: 'specs', name: '02_Specs', type: 'folder', isOpen: true, children: []
        }
    ],
    initialBlocks: [
        { type: 'h1', content: "Meeting Notes: Q3 Planning" },
        { type: 'p', content: "- Focus on enterprise features: SSO, Audit Logs.\n- Need a dashboard refresh." }
    ],
    promptText: "Draft a PRD for the Enterprise Dashboard based on these notes.",
    toolCall: {
        name: "fs_read_file",
        args: { path: "process_notes/meeting_notes.md" },
        resultSummary: "Read 12 lines from meeting_notes.md"
    },
    newFile: {
        folderName: '02_Specs',
        fileName: 'Q3_PRD.md',
        fileId: 'prd'
    },
    generatedBlocks: [
        { type: 'h1', content: "Q3 Product Requirement Document" },
        { type: 'h2', content: "1. Overview" },
        { type: 'p', content: "The Q3 initiative focuses on Enterprise readiness. Key deliverables include SSO integration and a comprehensive Audit Log dashboard." },
        { type: 'h2', content: "2. Key Features" },
        { type: 'ul', content: "Single Sign-On (SAML 2.0)\nAudit Trail API\nAdmin Role Management" }
    ],
    completionText: "Created `02_Specs/Q3_PRD.md`."
};

const MARKETING_SCENARIO: Scenario = {
    id: 'marketing',
    name: 'Marketing',
    icon: Megaphone,
    description: 'SEO Blog Post',
    initialFileId: 'seo_data',
    files: [
        {
            id: 'strategy', name: 'Strategy', type: 'folder', isOpen: true, children: [
                { id: 'seo_data', name: 'keywords_v2.csv', type: 'file' }
            ]
        },
        {
            id: 'content', name: 'Content', type: 'folder', isOpen: true, children: []
        }
    ],
    initialBlocks: [
        { type: 'h1', content: "Target Keywords (Q3)" },
        { type: 'table', content: "[[\"Keyword\",\"Volume\",\"Difficulty\"],[\"ai marketing tools\",\"12k\",\"High\"],[\"automated content creation\",\"5.4k\",\"Medium\"],[\"seo workflow automation\",\"1.2k\",\"Low\"]]" }
    ],
    promptText: "Write a blog post about 'AI in Marketing' targeting these keywords.",
    toolCall: {
        name: "fs_read_file",
        args: { path: "Strategy/keywords_v2.csv" },
        resultSummary: "Analyzed 3 key high-intent keywords."
    },
    newFile: {
        folderName: 'Content',
        fileName: 'AI_Marketing_Trends.md',
        fileId: 'blog_post'
    },
    generatedBlocks: [
        { type: 'h1', content: "The Future of AI in Marketing" },
        { type: 'p', content: "As automated content creation evolves, marketers are shifting focus from production to strategy." },
        { type: 'h2', content: "Optimizing Your SEO Workflow" },
        { type: 'p', content: "Leveraging AI marketing tools isn't just about speed; it's about precision. By automating routine drafts, teams can target high-volume keywords like 'seo workflow automation' effectively." },
        { type: 'ul', content: "Scale content production\nMaintain brand voice consistency\nAnalyze competitor gaps instantly" }
    ],
    completionText: "Drafted `Content/AI_Marketing_Trends.md`."
};

const FINANCE_SCENARIO: Scenario = {
    id: 'finance',
    name: 'Finance',
    icon: PieChart,
    description: 'Investment Memo',
    initialFileId: 'transcript',
    files: [
        {
            id: 'research', name: 'Research', type: 'folder', isOpen: true, children: [
                { id: 'transcript', name: 'NVDA_Q3_Transcript.pdf', type: 'file' }
            ]
        },
        {
            id: 'memos', name: 'Investment_Memos', type: 'folder', isOpen: true, children: []
        }
    ],
    initialBlocks: [
        { type: 'h1', content: "NVIDIA Corp. (NVDA) - Q3 Earnings Call" },
        { type: 'p', content: "CEO Jensen Huang: 'Data center demand is accelerating beyond our supply constraints...'" }
    ],
    promptText: "Draft an investment memo analyzing the Data Center growth.",
    toolCall: {
        name: "fs_read_file",
        args: { path: "Research/NVDA_Q3_Transcript.pdf" },
        resultSummary: "Extracted financial metrics from p. 1-14."
    },
    newFile: {
        folderName: 'Investment_Memos',
        fileName: 'NVDA_Memo.md',
        fileId: 'memo'
    },
    generatedBlocks: [
        { type: 'h1', content: "Investment Thesis: NVDA" },
        { type: 'h2', content: "1. Data Center Growth" },
        { type: 'p', content: "Revenue is up 279% YoY. The constrains on CoWoS packaging supply are the primary bottleneck, not demand." },
        { type: 'table', content: "[[\"Segment\",\"Revenue ($B)\",\"YoY Growth\"],[\"Data Center\",\"14.5\",\"+279%\"],[\"Gaming\",\"2.8\",\"+81%\"]]" },
        { type: 'h2', content: "Risk Factors" },
        { type: 'ul', content: "Supply chain concentration\nExport controls to China\nValuation multiple compression" }
    ],
    completionText: "Created `Investment_Memos/NVDA_Memo.md`."
};

const LEGAL_SCENARIO: Scenario = {
    id: 'legal',
    name: 'Legal',
    icon: Scale,
    description: 'Contract Review',
    initialFileId: 'contract',
    files: [
        {
            id: 'agreements', name: 'Agreements', type: 'folder', isOpen: true, children: [
                { id: 'contract', name: 'Service_MSA_Draft.pdf', type: 'file' }
            ]
        },
        {
            id: 'review', name: 'Internal_Review', type: 'folder', isOpen: true, children: []
        }
    ],
    initialBlocks: [
        { type: 'h1', content: "Master Services Agreement" },
        { type: 'p', content: "SECTION 8. INDEMNIFICATION. Provider shall indemnify Client against all claims, regardless of Provider's negligence..." }
    ],
    promptText: "Flag any non-standard indemnity clauses in this MSA.",
    toolCall: {
        name: "fs_read_file",
        args: { path: "Agreements/Service_MSA_Draft.pdf" },
        resultSummary: "Scanned 24 pages for risk keywords."
    },
    newFile: {
        folderName: 'Internal_Review',
        fileName: 'Risk_Assessment.md',
        fileId: 'risk_note'
    },
    generatedBlocks: [
        { type: 'h1', content: "Legal Risk Findings: MSA" },
        { type: 'h2', content: "Critical Flag: Indemnity" },
        { type: 'p', content: "Section 8 contains an uncapped, broad form indemnity. This is not standard market practice." },
        { type: 'h2', content: "Recommendation" },
        { type: 'ul', content: "Limit indemnity to gross negligence\nCap liability at 12 months fees\nExclude indirect damages" }
    ],
    completionText: "Drafted `Internal_Review/Risk_Assessment.md`."
};

const RFP_SCENARIO: Scenario = {
    id: 'rfp',
    name: 'RFP / Security',
    icon: Shield,
    description: 'Answer security questionnaires',
    initialFileId: 'security_policy',
    files: [
        {
            id: 'kb', name: 'knowledge_base', type: 'folder', isOpen: true, children: [
                { id: 'security_policy', name: 'Security_Policy.md', type: 'file' }
            ]
        },
        {
            id: 'drafts', name: 'DRAFTS', type: 'folder', isOpen: true, children: []
        }
    ],
    initialBlocks: [
        { type: 'h1', content: "Security Policy (v2024.1)" },
        { type: 'h2', content: "3. Data Protection" },
        { type: 'p', content: "3.1. Encryption at Rest: All customer data is encrypted using AES-256 GCM. Keys are managed via AWS KMS with automatic rotation every 90 days." },
        { type: 'h2', content: "4. Access Control" },
        { type: 'ul', content: "MFA is enforced for all employees.\nRole-based access control (RBAC) is implemented." }
    ],
    promptText: "Answer their security questionnaire about encryption standards.",
    toolCall: {
        name: "fs_read_file",
        args: { path: "knowledge_base/Security_Policy.md" },
        resultSummary: "Read Data Protection policies."
    },
    newFile: {
        folderName: 'DRAFTS',
        fileName: 'Response.md',
        fileId: 'response'
    },
    generatedBlocks: [
        { type: 'h1', content: "Security Questionnaire Response" },
        { type: 'p', content: "Based on our security policy, here is the draft response:" },
        { type: 'h2', content: "Q: How do you protect customer data?" },
        { type: 'p', content: "We enforce industry-standard encryption protocols. All data at rest is encrypted via AES-256 GCM, and data in transit uses TLS 1.3." },
        { type: 'ul', content: "AWS KMS Key Rotation (90 days)\nSOC2 Type II Compliant Infrastructure" }
    ],
    completionText: "Drafted response in `DRAFTS/Response.md`."
};

const SCENARIOS = {
    pm: PM_SCENARIO,
    marketing: MARKETING_SCENARIO,
    finance: FINANCE_SCENARIO,
    legal: LEGAL_SCENARIO,
    rfp: RFP_SCENARIO
};

export function AgentAnimation({ activeScenarioId }: { activeScenarioId: ScenarioId }) {
    const scenario = SCENARIOS[activeScenarioId];

    const [isLoading, setIsLoading] = useState(false);
    const [showReplay, setShowReplay] = useState(false);
    const [step, setStep] = useState<AnimationStep>("idle");
    const [activeFileId, setActiveFileId] = useState<string>(scenario.initialFileId);
    const [blocks, setBlocks] = useState<ContentBlock[]>(scenario.initialBlocks);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [files, setFiles] = useState(scenario.files);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef(true);

    // Helper to update file system structure safely
    const addFileToFolder = (folderName: string, fileName: string, newId: string) => {
        setFiles(prev => prev.map(item => {
            if (item.name === folderName && item.type === "folder") {
                return {
                    ...item,
                    children: [...(item.children || []), { id: newId, name: fileName, type: "file" }]
                };
            }
            return item;
        }));
    };

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const runAnimation = async () => {
        if (!mountedRef.current) return;

        // Reset State for Run
        setStep("idle");
        setChatInput("");
        setChatMessages([]);
        setActiveFileId(scenario.initialFileId);
        setBlocks(scenario.initialBlocks);
        setFiles(JSON.parse(JSON.stringify(scenario.files))); // Deep copy reset
        setShowReplay(false);

        const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

        // Start Delay
        await wait(1500);
        if (!mountedRef.current) return;

        // 1. Type Prompt in Chat
        setStep("typing_prompt");
        const command = scenario.promptText;
        for (let i = 0; i <= command.length; i++) {
            if (!mountedRef.current) return;
            setChatInput(command.slice(0, i));
            await wait(30);
        }
        await wait(400);

        // 2. Submit Message
        if (!mountedRef.current) return;
        setChatMessages([{ role: "user", content: command }]);
        setChatInput("");
        setStep("processing");
        await wait(600);

        // 3. Tool Execution Phase
        if (!mountedRef.current) return;

        // Add running tool call
        const toolMsgId = "tool-" + Date.now();
        const toolArgsString = JSON.stringify(scenario.toolCall.args);
        setChatMessages(prev => [...prev, {
            role: "assistant",
            toolCall: {
                id: toolMsgId,
                name: scenario.toolCall.name,
                args: toolArgsString,
                status: "running"
            }
        }]);

        await wait(2000); // Simulate processing time

        // Mark tool as completed
        if (!mountedRef.current) return;
        setChatMessages(prev => prev.map(msg =>
            msg.toolCall?.id === toolMsgId
                ? { ...msg, toolCall: { ...msg.toolCall!, status: "completed", result: scenario.toolCall.resultSummary } }
                : msg
        ));

        await wait(500);

        // 4. Create File & Switch
        if (!mountedRef.current) return;
        setStep("generating");
        addFileToFolder(scenario.newFile.folderName, scenario.newFile.fileName, scenario.newFile.fileId);
        await wait(300);
        setActiveFileId(scenario.newFile.fileId);
        setBlocks([]); // Start empty

        // 5. Stream Content Block by Block
        await wait(500);

        const newBlocks: ContentBlock[] = [];
        for (const block of scenario.generatedBlocks) {
            if (!mountedRef.current) return;

            // Add empty block of this type
            const currentBlock = { ...block, content: block.type === 'table' ? block.content : "" };
            newBlocks.push(currentBlock);
            setBlocks([...newBlocks]); // Show block container

            if (block.type !== 'table') {
                // Stream text content
                const chars = block.content.split('');
                for (let i = 0; i <= chars.length; i++) {
                    if (!mountedRef.current) return;
                    newBlocks[newBlocks.length - 1].content = block.content.slice(0, i);
                    setBlocks([...newBlocks]); // Trigger re-render

                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                    }
                    await wait(25); // Slower typing
                }
            } else {
                // Just a small pause for table "rendering"
                await wait(300);
            }

            await wait(100); // Pause between blocks
        }

        // 6. Complete
        if (!mountedRef.current) return;
        setStep("complete");
        setChatMessages(prev => [...prev, { role: "assistant", content: scenario.completionText }]);
        setShowReplay(true);
    };

    // Reset when scenario changes
    useEffect(() => {
        mountedRef.current = false; // Cancel previous run immediately
        setIsLoading(true);

        const timer = setTimeout(() => {
            mountedRef.current = true;
            setIsLoading(false);
            runAnimation();
        }, 500); // Wait for fade out/cleanup

        return () => {
            mountedRef.current = false;
            clearTimeout(timer);
        };
    }, [activeScenarioId]);

    const handleReplay = () => {
        runAnimation();
    };

    const activeFile = files.flatMap(f => [f, ...(f.children || [])]).find(f => f.id === activeFileId);

    return (
        <div className="flex w-full h-full bg-white items-stretch text-left font-sans text-[#111318] relative">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center fade-in duration-200">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
            )}

            {/* Replay Overlay */}
            {showReplay && !isLoading && (
                <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] flex items-center justify-center fade-in duration-500">
                    <button
                        onClick={handleReplay}
                        className="flex items-center gap-2 px-6 py-3 bg-[#111318] text-white rounded-full font-bold shadow-lg hover:scale-105 transition-all"
                    >
                        <Loader2 className="w-4 h-4" /> {/* Reuse loader icon as replay for now, or use rotate-ccw if available */}
                        Replay Demo
                    </button>
                </div>
            )}

            {/* Sidebar (FileExplorer) - Hidden on mobile */}
            <div className="w-56 flex-none border-r border-[#e5e7eb] bg-[#f9fafb] flex flex-col hidden md:flex">
                {/* Workspace Switcher Mock */}
                <div className="p-3 border-b border-[#f3f4f6]">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white transition-colors cursor-default">
                        <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-[10px] font-bold">W</div>
                        <span className="text-sm font-medium text-gray-700 truncate">Workspace</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                    </div>
                </div>

                {/* Tree */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {files.map((item) => (
                        <div key={item.id}>
                            <div className="flex items-center gap-1.5 px-2 py-1.5 text-gray-600 hover:bg-white rounded-md cursor-default text-[13px] font-medium">
                                {item.type === "folder" && <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                <span className="material-symbols-outlined text-[16px] text-gray-400">
                                    {item.type === "folder" ? "folder" : "description"}
                                </span>
                                {item.name}
                            </div>
                            {item.isOpen && item.children?.map(child => (
                                <div
                                    key={child.id}
                                    className={cn(
                                        "ml-5 flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-default text-[13px] transition-colors",
                                        activeFileId === child.id ? "bg-white shadow-sm border border-gray-200/60 text-gray-900 font-medium" : "text-gray-500 hover:bg-gray-100/50"
                                    )}
                                >
                                    <span className={`material-symbols-outlined text-[16px] ${child.name.endsWith(".md") || child.name.endsWith(".xlsx") ? "text-black" : "text-gray-400"}`}>
                                        description
                                    </span>
                                    {child.name}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-[#f3f4f6] text-xs text-gray-400 flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" /> Settings
                </div>
            </div>

            {/* Main Content (Editor) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Header */}
                <div className="h-12 border-b border-[#e5e7eb] flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Menu className="w-4 h-4 text-gray-400 lg:hidden" />
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium text-gray-900 truncate max-w-[150px]">{activeFile?.name}</span>
                        </div>
                        {step === "processing" && (
                            <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-600 animate-pulse">
                                <Sparkles className="w-3 h-3" /> Thinking...
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-1.5">
                            <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] text-black font-bold">AJ</div>
                        </div>
                        <Share2 className="w-4 h-4 text-gray-400" />
                    </div>
                </div>

                {/* Editor Content Area */}
                <div className="flex-1 overflow-y-auto relative bg-white" ref={scrollContainerRef}>
                    <div className="max-w-3xl mx-auto py-12 px-8 min-h-full">
                        {blocks.map((block, idx) => (
                            <div key={idx} className="animate-in fade-in duration-300 mb-6">
                                {block.type === 'h1' && (
                                    <h1 className="text-4xl font-bold tracking-tight text-[#111318] mb-6 font-serif">{block.content}</h1>
                                )}
                                {block.type === 'h2' && (
                                    <h2 className="text-2xl font-bold tracking-tight text-[#111318] mt-8 mb-4 font-serif">{block.content}</h2>
                                )}
                                {block.type === 'p' && (
                                    <p className="text-[1.0625rem] leading-7 text-[#374151] mb-4">{block.content}</p>
                                )}
                                {block.type === 'ul' && (
                                    <ul className="list-disc pl-5 mb-4 text-[1.0625rem] leading-7 text-[#374151] space-y-1">
                                        {block.content.split('\n').map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                                {block.type === 'table' && (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden my-4 shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-[#f9fafb] text-gray-500 font-medium border-b border-gray-200">
                                                <tr>
                                                    {JSON.parse(block.content)[0].map((header: string, i: number) => (
                                                        <th key={i} className="px-4 py-2">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {JSON.parse(block.content).slice(1).map((row: string[], i: number) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        {row.map((cell: string, j: number) => (
                                                            <td key={j} className={cn("px-4 py-2", j === 3 && cell === "Compliant" ? "text-black font-medium" : "text-gray-700")}>
                                                                {cell}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                        {blocks.length === 0 && <div className="h-full w-full" />}
                    </div>
                </div>
            </div>

            {/* Right Panel (Agent) - Hidden on smaller screens */}
            <div className="w-80 flex-none border-l border-[#e5e7eb] bg-white flex flex-col hidden xl:flex">
                <div className="h-12 border-b border-[#e5e7eb] flex items-center justify-between px-4">
                    <span className="text-sm font-semibold text-gray-900">Chat</span>
                    <div className="flex gap-1">
                        <History className="w-4 h-4 text-gray-400" />
                        <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                    {chatMessages.length === 0 && (
                        <div className="text-center mt-10 space-y-2">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto">
                                <Sparkles className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-400">How can I help you today?</p>
                        </div>
                    )}

                    {chatMessages.map((msg, i) => (
                        <div key={i} className={cn("flex flex-col gap-1 text-sm animate-in slide-in-from-bottom-2 fade-in", msg.role === "user" ? "items-end" : "items-start")}>
                            {msg.role === "user" ? (
                                <div className="px-3 py-2 rounded-xl max-w-[90%] bg-gray-100 text-gray-900 rounded-br-none">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className="space-y-2 w-full">
                                    {/* Tool Call Card */}
                                    {msg.toolCall && (
                                        <div className={cn(
                                            "bg-white border rounded-lg p-3 text-xs shadow-sm transition-all duration-300",
                                            msg.toolCall.status === "running" ? "border-l-2 border-l-gray-300 border-gray-200" : "border-l-2 border-l-black border-gray-200"
                                        )}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {msg.toolCall.status === "running" ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                                ) : (
                                                    <Check className="w-3.5 h-3.5 text-black" />
                                                )}
                                                <span className="font-medium text-gray-900">{msg.toolCall.name}</span>
                                            </div>
                                            <div className="font-mono text-gray-500 bg-gray-50 px-1.5 py-1 rounded mb-1 truncate">
                                                {msg.toolCall.args}
                                            </div>
                                            {msg.toolCall.status === "completed" && msg.toolCall.result && (
                                                <div className="text-gray-400 flex items-center gap-1 mt-1">
                                                    <ChevronRight className="w-3 h-3" />
                                                    {msg.toolCall.result}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Text Content */}
                                    {msg.content && (
                                        <div className="flex gap-2 max-w-[90%]">
                                            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center shrink-0 mt-1">
                                                <Bot className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div className="bg-white text-gray-700 px-0 py-1">
                                                {msg.content}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-[#e5e7eb]">
                    <div className="relative">
                        <input
                            type="text"
                            value={chatInput}
                            readOnly
                            placeholder="Ask zerodraft..."
                            className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
