"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    Bot,
    Check,
    ChevronDown,
    ChevronRight,
    Loader2,
    Menu,
    Plus,
    RotateCcw,
    Send,
    Settings,
    Share2,
    Sparkles,
    History,
    BrainCircuit,
    Lightbulb,
    BookOpen,
    Globe2,
    FileText,
    PenTool
} from "lucide-react";


// --- Types ---

type FileSystemItem = {
    id: string;
    name: string;
    type: "file" | "folder";
    children?: FileSystemItem[];
    isOpen?: boolean;
    icon?: "slack" | "jira" | "zoom" | "doc" | "notebook" | "globe" | "manuscript" | "pen";
};

type ContentBlock = {
    type: 'h1' | 'h2' | 'p' | 'ul' | 'table' | 'quote';
    content: string;
};

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content?: string;
    isThinking?: boolean;
    toolCall?: {
        name: string;
        args: string;
        status: "running" | "completed";
        result?: string;
    };
};

type ActionType =
    | { type: 'think'; content: string; duration: number }
    | { type: 'tool_call'; name: string; args: object; resultSummary: string; duration: number }
    // User message type to show agent commentary
    | { type: 'agent_message'; content: string; duration: number }
    | { type: 'open_file'; fileId: string; duration?: number }
    | { type: 'create_file'; folderId: string; fileId: string; name: string; icon?: "doc"; duration?: number }
    | { type: 'stream_content'; fileId: string; blocks: ContentBlock[]; append?: boolean }

type ScenarioId = 'pm' | 'fiction';

interface Scenario {
    id: ScenarioId;
    name: string;
    description: string;
    initialFileId: string;
    files: FileSystemItem[];
    fileContents: Record<string, ContentBlock[]>;
    promptText: string;
    actions: ActionType[];
    completionText: string;
}

// --- Icon Components (Same as before) ---

function SlackIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
    );
}

function JiraIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.5V1.005A1.005 1.005 0 0 0 23.013 0z" />
        </svg>
    );
}

function ZoomIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-4.865-3.33a.482.482 0 0 0-.498.028l-2.937 2.052V9.2c0-.66-.54-1.2-1.2-1.2H6c-.66 0-1.2.54-1.2 1.2v5.6c0 .66.54 1.2 1.2 1.2h8.5c.66 0 1.2-.54 1.2-1.2v-1.55l2.937 2.052a.48.48 0 0 0 .498.028.502.502 0 0 0 .265-.448V9.118a.502.502 0 0 0-.265-.448z" />
        </svg>
    );
}

// --- File contents ---

const RECORDING_CONTENT: ContentBlock[] = [
    { type: 'h1', content: "Zoom Recording — Acme Corp SSO Feedback" },
    { type: 'p', content: "📹 42 min · Feb 12, 2025 · Sarah Chen (PM), Lisa Park (Acme IT Director)" },
    { type: 'h2', content: "Transcript Preview" },
    { type: 'p', content: "Lisa Park: \"Right now we're managing SSO through a clunky SAML proxy. Our IT team spends about 2 hours every time we onboard a new department. If you could get setup time under 15 minutes, that's a game-changer for us.\"" },
    { type: 'p', content: "Mike Torres: \"From our side, we'd need to support both SAML 2.0 and OIDC. The Okta integration is non-negotiable — 80% of our enterprise pipeline is on Okta.\"" },
    { type: 'p', content: "Sarah Chen: \"What about SCIM provisioning? That came up in the last 3 customer calls.\"" },
    { type: 'p', content: "Lisa Park: \"Absolutely. We need users auto-provisioned when they're added in Okta. Right now we have a manual onboarding process that takes a full day.\"" },
];

const SLACK_CONTENT: ContentBlock[] = [
    { type: 'h1', content: "#customer-feedback — Acme SSO Requests" },
    { type: 'p', content: "8 messages · Last 14 days" },
    { type: 'h2', content: "Thread: Acme follow-up" },
    { type: 'p', content: "@sarah: Just got off the call with Lisa from Acme. SSO is their #1 blocker for the enterprise contract. They need SAML + Okta at minimum." },
];

const JIRA_CONTENT: ContentBlock[] = [
    { type: 'h1', content: "Jira — AUTH Backlog" },
    { type: 'p', content: "12 items · Project: AUTH · Filtered: SSO enterprise" },
    { type: 'table', content: "[[\"Key\",\"Summary\",\"Status\",\"Priority\"],[\"AUTH-142\",\"SCIM provisioning support\",\"Backlog\",\"High\"],[\"AUTH-156\",\"Okta SAML connector\",\"Backlog\",\"Critical\"]]" },
];

const SPEC_CONTENT_INITIAL: ContentBlock[] = [
    { type: 'h1', content: "Enterprise Auth Specification" },
    { type: 'p', content: "Status: Draft · Owner: @sarah · Updated: 2 days ago" },
    { type: 'h2', content: "Overview" },
    { type: 'p', content: "This document outlines the architecture for our Enterprise SSO solution. We aim to support SAML 2.0 and OIDC for seamless integration with major IDPs." },
    { type: 'h2', content: "Scope" },
    { type: 'ul', content: "SAML 2.0 Service Provider implementation\nRole-based access control (RBAC)\nAudit logging for auth events" },
];

const GENERATED_SLACK_UPDATE: ContentBlock[] = [
    { type: 'h1', content: "Draft: Team Update — Acme SSO" },
    { type: 'p', content: "Channel: #engineering" },
    { type: 'p', content: "Team — just finished the discovery call with Acme. Good news: they're ready to move forward, but paying for the Enterprise tier depends entirely on our SSO implementation." },
    { type: 'ul', content: "Critical: Must support Okta SAML 2.0 + OIDC\nCritical: SCIM provisioning (saves them 1 day/user)\nGoal: Setup time < 15 mins (currently takes them 2 hours)" },
    { type: 'p', content: "I've drafted the tickets below. Let's spike on the Okta connector this sprint." }
];

const GENERATED_JIRA_TICKETS: ContentBlock[] = [
    { type: 'h1', content: "Draft: Jira Tickets (Acme Requirements)" },
    { type: 'table', content: "[[\"Summary\",\"Description\",\"Points\"],[\"Okta SAML 2.0 Connector\",\"Implement SAML SP metadata generation and assertion consumer service compatible with Okta.\",\"5\"],[\"SCIM 2.0 User Provisioning\",\"Support /Users and /Groups endpoints for auto-provisioning via Okta SCIM.\",\"8\"],[\"SSO Setup Wizard\",\"UI flow to guide admins through IDP configuration in < 15 mins.\",\"3\"]]" }
];

const GENERATED_SPEC_ADDITION: ContentBlock[] = [
    { type: 'h2', content: "Acme Requirements (New)" },
    { type: 'p', content: "Added from Customer Discovery Call (Feb 12)" },
    { type: 'h2', content: "1. Identity Providers" },
    { type: 'ul', content: "Primary: Okta (80% of pipeline)\nProtocol: SAML 2.0 AND OIDC required" },
    { type: 'h2', content: "2. Provisioning (SCIM)" },
    { type: 'quote', content: "\"We need users auto-provisioned when they're added in Okta.\" — Lisa Park" },
    { type: 'ul', content: "Must support SCIM 2.0 standard\nMap Okta groups to local workspace roles\nInstant de-provisioning upon Okta removal" },
    { type: 'h2', content: "3. UX Requirements" },
    { type: 'ul', content: "Self-serve setup wizard for IT admins\nTarget setup time: < 15 minutes" }
];

// --- Fiction Writer Content ---

const CHARACTER_NOTES_CONTENT: ContentBlock[] = [
    { type: 'h1', content: "Character Notes — Kael Ashborn" },
    { type: 'p', content: "📝 Last updated: Feb 10, 2025" },
    { type: 'h2', content: "Core Identity" },
    { type: 'ul', content: "Age: 28 · Former soldier, now reluctant leader\nMotivation: Protect his younger sister Lira\nFlaw: Trusts no one — isolates allies when stakes rise\nVoice: Terse, dry humor, avoids emotion" },
    { type: 'h2', content: "Arc (Book 1)" },
    { type: 'p', content: "Kael begins as a lone operative running supply raids. By Chapter 3, he's forced to confront Commander Voss — the man who burned his village. This is the turning point where he stops running and starts leading." },
    { type: 'quote', content: "\"I didn't come back to be a hero. I came back because no one else will.\"" },
];

const WORLD_BUILDING_CONTENT: ContentBlock[] = [
    { type: 'h1', content: "World Bible — The Ashlands" },
    { type: 'p', content: "🌍 Setting Document · Fantasy/Post-Apocalyptic" },
    { type: 'h2', content: "Geography" },
    { type: 'ul', content: "The Ashlands: Scorched plains surrounding the Ironspire\nThe Verdance: Last fertile valley, controlled by the Collective\nThe Undercroft: Network of tunnels beneath the old capital" },
    { type: 'h2', content: "Factions" },
    { type: 'table', content: "[[\"Faction\",\"Leader\",\"Goal\"],[\"The Collective\",\"Commander Voss\",\"Control all remaining resources\"],[\"The Drifters\",\"Kael (reluctant)\",\"Survive and resist\"],[\"The Weavers\",\"Elder Maren\",\"Restore the old magic\"]]" },
    { type: 'h2', content: "Magic System" },
    { type: 'p', content: "Threadweaving — drawing energy from the land's memory. Costs the user physical vitality. Overuse causes 'greying' (premature aging)." },
];

const MANUSCRIPT_CONTENT: ContentBlock[] = [
    { type: 'h1', content: "The Last Light — Manuscript" },
    { type: 'p', content: "Status: Draft · Word Count: 24,300 · Target: 80,000" },
    { type: 'h2', content: "Chapter 1 — The Raid" },
    { type: 'p', content: "The supply convoy moved through the canyon at dusk, exactly as Kael had predicted. He counted twelve guards. Too many for a clean job, not enough for him to walk away." },
    { type: 'h2', content: "Chapter 2 — The Message" },
    { type: 'p', content: "Lira's letter arrived folded into a dead bird — the Drifters' way of saying 'urgent.' Three words: Voss found us." },
];

const GENERATED_CHAPTER_DRAFT: ContentBlock[] = [
    { type: 'h1', content: "Chapter 3 — The Confrontation" },
    { type: 'p', content: "The Ironspire rose from the ash like a broken tooth against the sky. Kael crouched behind the remnants of a watchtower, his fingers tracing the hilt of his blade — a nervous habit he thought he'd buried years ago." },
    { type: 'p', content: "\"You don't have to do this alone,\" Maren said from somewhere behind him. Her voice carried the calm of someone who had already seen how this ended." },
    { type: 'p', content: "\"I'm not doing it for company.\" He didn't turn around." },
    { type: 'p', content: "The Collective's banners hung limp in the dead air — crimson and iron-gray, the colors of a world that had stopped pretending. Below, soldiers moved in precise formations across the courtyard. Voss trained them well. Voss trained everyone well, right up until he put a torch to everything they loved." },
    { type: 'quote', content: "He could still smell it. After six years, he could still smell the smoke." },
    { type: 'p', content: "Kael closed his eyes and reached for the threads. They came reluctantly, thin and brittle this far into the Ashlands — like trying to start a fire with wet wood. He pulled anyway, feeling the familiar ache bloom behind his ribs, the greying at his temples spreading another fraction of an inch." },
    { type: 'p', content: "When he opened his eyes, the watchtower's shadow stretched impossibly long, pooling around the nearest guard's feet like dark water. The man froze. Then crumpled." },
    { type: 'p', content: "\"Move,\" Kael said. And for the first time in six years, someone followed him into the dark." },
];

const GENERATED_OUTLINE_ADDITION: ContentBlock[] = [
    { type: 'h2', content: "Chapter 3 Summary (New)" },
    { type: 'p', content: "Added to manuscript outline" },
    { type: 'h2', content: "Key Beats" },
    { type: 'ul', content: "Kael arrives at the Ironspire with Maren\nFirst use of threadweaving — establishes magic cost\nSilent takedown of outer guard\nKael accepts a follower for the first time (arc shift)" },
    { type: 'h2', content: "Character Development" },
    { type: 'quote', content: "Turning point: Kael stops working alone. His 'trust no one' flaw cracks when Maren follows without asking permission." },
    { type: 'h2', content: "Threads to Resolve" },
    { type: 'ul', content: "Voss confrontation set up for Chapter 4\nGreying side-effect foreshadows cost of final battle\nLira's location still unknown — tension maintained" },
];

// --- PM Agent Scenario ---

const PM_SCENARIO: Scenario = {
    id: 'pm',
    name: 'Discovery Agent',
    description: 'Call → Plan → Execute actions',
    initialFileId: 'recording',
    files: [
        {
            id: 'zoom_folder', name: 'Recordings', type: 'folder', isOpen: true, icon: 'zoom', children: [
                { id: 'recording', name: 'Acme Corp — SSO Feedback', type: 'file', icon: 'zoom' }
            ]
        },
        {
            id: 'drafts', name: 'Drafts', type: 'folder', isOpen: true, children: []
        },
        {
            id: 'specs', name: 'Specs', type: 'folder', isOpen: true, children: [
                { id: 'spec_auth', name: 'Enterprise_Auth.md', type: 'file', icon: 'doc' }
            ]
        },
        {
            id: 'context', name: 'Context', type: 'folder', isOpen: false, children: [
                { id: 'slack_home', name: 'Slack', type: 'file', icon: 'slack' },
                { id: 'jira_home', name: 'Jira', type: 'file', icon: 'jira' }
            ]
        }
    ],
    fileContents: {
        'recording': RECORDING_CONTENT,
        'slack_home': SLACK_CONTENT,
        'jira_home': JIRA_CONTENT,
        'spec_auth': SPEC_CONTENT_INITIAL,
    },
    promptText: "Summarize the call, draft tickets, and update the Auth spec.",
    completionText: "Done. I've drafted the update, created tickets, and updated the spec.",
    actions: [
        // 1. Analyze Context
        { type: 'tool_call', name: 'zoom_transcript', args: { id: "Acme Call" }, resultSummary: "Parsed 42 min transcript", duration: 1500 },
        { type: 'tool_call', name: 'slack_search', args: { query: "Acme SSO" }, resultSummary: "Found 8 messages", duration: 1200 },
        { type: 'tool_call', name: 'jira_search', args: { project: "AUTH" }, resultSummary: "Found 12 existing tickets", duration: 1000 },

        // 2. Think / Plan
        {
            type: 'think',
            content: "Analyzing call transcript...\n• Key Friction: Setup time (2h -> 15m)\n• Tech Req: Okta, SAML, OIDC, SCIM\n• Urgency: High (lost 2 deals)\n\nPlan:\n1. Draft #engineering update highlighting urgency\n2. Create tickets for SCIM & Okta\n3. Append requirements to Enterprise Auth Spec",
            duration: 3500
        },

        // 3. Draft Slack Update
        { type: 'tool_call', name: 'fs_write_file', args: { path: "Drafts/Slack_Update.md" }, resultSummary: "Created file", duration: 600 },
        { type: 'create_file', folderId: 'drafts', fileId: 'draft_slack', name: 'Slack_Update.md', duration: 100 },
        { type: 'stream_content', fileId: 'draft_slack', blocks: GENERATED_SLACK_UPDATE },

        { type: 'agent_message', content: "I've drafted the update for #engineering. Now grabbing existing backlog items to deduplicate...", duration: 2000 },

        // 4. Draft Jira Tickets
        { type: 'tool_call', name: 'fs_write_file', args: { path: "Drafts/Jira_Tickets.md" }, resultSummary: "Created file", duration: 600 },
        { type: 'create_file', folderId: 'drafts', fileId: 'draft_jira', name: 'Jira_Tickets.md', duration: 100 },
        { type: 'stream_content', fileId: 'draft_jira', blocks: GENERATED_JIRA_TICKETS },

        { type: 'agent_message', content: "Tickets drafted. Finally, I'll update the main Auth Spec with these new requirements.", duration: 2000 },

        // 5. Update Spec (Append)
        { type: 'tool_call', name: 'fs_read_file', args: { path: "Specs/Enterprise_Auth.md" }, resultSummary: "Read file", duration: 800 },
        { type: 'open_file', fileId: 'spec_auth', duration: 200 },
        { type: 'stream_content', fileId: 'spec_auth', blocks: GENERATED_SPEC_ADDITION, append: true },
    ]
};

// --- Fiction Writer Scenario ---

const FICTION_SCENARIO: Scenario = {
    id: 'fiction',
    name: 'Writing Agent',
    description: 'Research → Draft → Refine',
    initialFileId: 'char_notes',
    files: [
        {
            id: 'research', name: 'Research', type: 'folder', isOpen: true, icon: 'notebook', children: [
                { id: 'char_notes', name: 'Character Notes — Kael', type: 'file', icon: 'notebook' },
                { id: 'world_doc', name: 'World Bible — Ashlands', type: 'file', icon: 'globe' }
            ]
        },
        {
            id: 'fiction_drafts', name: 'Drafts', type: 'folder', isOpen: true, children: []
        },
        {
            id: 'manuscripts', name: 'Manuscripts', type: 'folder', isOpen: true, children: [
                { id: 'manuscript_main', name: 'The_Last_Light.md', type: 'file', icon: 'manuscript' }
            ]
        },
    ],
    fileContents: {
        'char_notes': CHARACTER_NOTES_CONTENT,
        'world_doc': WORLD_BUILDING_CONTENT,
        'manuscript_main': MANUSCRIPT_CONTENT,
    },
    promptText: "Write Chapter 3 — the confrontation at the Ironspire. Use my character notes and world bible.",
    completionText: "Done. Chapter 3 is drafted and I've updated the manuscript outline.",
    actions: [
        // 1. Read context
        { type: 'tool_call', name: 'read_notes', args: { file: "Character Notes" }, resultSummary: "Loaded Kael's arc & voice", duration: 1200 },
        { type: 'tool_call', name: 'read_notes', args: { file: "World Bible" }, resultSummary: "Loaded factions, magic system", duration: 1000 },
        { type: 'tool_call', name: 'fs_read_file', args: { path: "Manuscripts/The_Last_Light.md" }, resultSummary: "Read Ch 1–2 (24.3k words)", duration: 1400 },

        // 2. Think / Plan
        {
            type: 'think',
            content: "Planning Chapter 3...\n• Setting: Ironspire ruins, ash plains\n• POV: Kael (close 3rd)\n• Key beat: First threadweaving scene\n• Arc shift: Kael allows Maren to follow\n• Tone: Tense, sparse prose\n\nPlan:\n1. Draft the confrontation scene (~1,200 words)\n2. Update manuscript outline with chapter summary",
            duration: 3500
        },

        // 3. Draft Chapter
        { type: 'tool_call', name: 'consult_writer', args: { style: "sparse literary fantasy" }, resultSummary: "Style locked: terse, sensory", duration: 800 },
        { type: 'tool_call', name: 'fs_write_file', args: { path: "Drafts/Chapter_3_Draft.md" }, resultSummary: "Created file", duration: 600 },
        { type: 'create_file', folderId: 'fiction_drafts', fileId: 'chapter_3', name: 'Chapter_3_Draft.md', icon: 'doc', duration: 100 },
        { type: 'stream_content', fileId: 'chapter_3', blocks: GENERATED_CHAPTER_DRAFT },

        { type: 'agent_message', content: "Chapter 3 drafted. Now I'll update the manuscript outline with the new chapter summary.", duration: 2000 },

        // 4. Update Manuscript Outline
        { type: 'tool_call', name: 'fs_read_file', args: { path: "Manuscripts/The_Last_Light.md" }, resultSummary: "Read file", duration: 800 },
        { type: 'open_file', fileId: 'manuscript_main', duration: 200 },
        { type: 'stream_content', fileId: 'manuscript_main', blocks: GENERATED_OUTLINE_ADDITION, append: true },
    ]
};

const SCENARIOS: Record<ScenarioId, Scenario> = {
    pm: PM_SCENARIO,
    fiction: FICTION_SCENARIO,
};

export function AgentAnimation({ activeScenarioId }: { activeScenarioId: ScenarioId }) {
    const scenario = SCENARIOS[activeScenarioId];

    const [isLoading, setIsLoading] = useState(false);
    const [showReplay, setShowReplay] = useState(false);
    const [activeFileId, setActiveFileId] = useState<string>(scenario.initialFileId);
    const [blocks, setBlocks] = useState<ContentBlock[]>(scenario.fileContents[scenario.initialFileId] || []);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [files, setFiles] = useState(scenario.files);
    const [allFileContents, setAllFileContents] = useState<Record<string, ContentBlock[]>>({ ...scenario.fileContents });

    // Refs for animation state
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef(true);
    const animatingFileRef = useRef<string | null>(null);
    const animatingBlocksRef = useRef<ContentBlock[]>([]);

    // -- Helper Functions --

    const addFileToFolder = (folderId: string, fileName: string, newId: string, icon?: "doc") => {
        setFiles(prev => prev.map(item => {
            if (item.id === folderId && item.type === "folder") {
                return {
                    ...item,
                    children: [...(item.children || []), { id: newId, name: fileName, type: "file", icon: icon || "doc" }]
                };
            }
            return item;
        }));
    };

    const handleFileClick = useCallback((fileId: string) => {
        setActiveFileId(fileId);
        if (animatingFileRef.current === fileId) {
            setBlocks([...animatingBlocksRef.current]);
        } else if (allFileContents[fileId]) {
            setBlocks(allFileContents[fileId]);
        } else {
            setBlocks([{ type: 'p', content: 'Loading...' }]);
        }
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, [allFileContents]);

    const handleFolderToggle = useCallback((folderId: string) => {
        setFiles(prev => prev.map(item => {
            if (item.id === folderId && item.type === "folder") {
                return { ...item, isOpen: !item.isOpen };
            }
            return item;
        }));
    }, []);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

    // -- Animation Loop --

    const runAnimation = async () => {
        if (!mountedRef.current) return;

        // Reset
        setChatInput("");
        setChatMessages([]);
        setActiveFileId(scenario.initialFileId);
        setBlocks(scenario.fileContents[scenario.initialFileId] || []);
        setFiles(JSON.parse(JSON.stringify(scenario.files)));
        setAllFileContents({ ...scenario.fileContents });
        setShowReplay(false);
        animatingFileRef.current = null;
        animatingBlocksRef.current = [];

        await wait(1000);
        if (!mountedRef.current) return;

        // 1. Type Prompt
        const command = scenario.promptText;
        for (let i = 0; i <= command.length; i++) {
            if (!mountedRef.current) return;
            setChatInput(command.slice(0, i));
            await wait(25);
        }
        await wait(400);

        // 2. Submit Prompt
        setChatMessages([{ id: "msg-user", role: "user", content: command }]);
        setChatInput("");
        await wait(600);

        // 3. Execute Actions
        for (const action of scenario.actions) {
            if (!mountedRef.current) return;

            if (action.type === 'think') {
                const thinkId = `think-${Date.now()}`;
                setChatMessages(prev => [...prev, {
                    id: thinkId,
                    role: "assistant",
                    isThinking: true,
                    content: action.content
                }]);
                await wait(action.duration);
            }

            if (action.type === 'agent_message') {
                setChatMessages(prev => [...prev, {
                    id: `msg-${Date.now()}`,
                    role: "assistant",
                    content: action.content
                }]);
                await wait(action.duration);
            }

            if (action.type === 'tool_call') {
                const toolId = `tool-${Date.now()}`;
                const argsString = JSON.stringify(action.args);

                // Start
                setChatMessages(prev => [...prev, {
                    id: toolId,
                    role: "assistant",
                    toolCall: { name: action.name, args: argsString, status: "running" }
                }]);

                await wait(action.duration);

                // Complete
                setChatMessages(prev => prev.map(msg =>
                    msg.id === toolId && msg.toolCall
                        ? { ...msg, toolCall: { ...msg.toolCall, status: "completed", result: action.resultSummary } }
                        : msg
                ));
                await wait(300);
            }

            if (action.type === 'create_file') {
                addFileToFolder(action.folderId, action.fileId, action.name, action.icon);
                await wait(action.duration || 500);
                setActiveFileId(action.fileId);
                setBlocks([]); // New file empty
                animatingFileRef.current = action.fileId;
                animatingBlocksRef.current = [];
            }

            if (action.type === 'open_file') {
                setActiveFileId(action.fileId);
                const existing = allFileContents[action.fileId] || [];
                setBlocks(existing);
                animatingFileRef.current = action.fileId;
                animatingBlocksRef.current = [...existing];
                await wait(action.duration || 500);
            }

            if (action.type === 'stream_content') {
                const targetFileId = action.fileId;

                // Initialize blocks for this stream
                let currentBlocks = appendModeRefCheck(targetFileId, !!action.append);

                for (const block of action.blocks) {
                    if (!mountedRef.current) return;

                    const newBlock = { ...block, content: block.type === 'table' ? block.content : "" };
                    currentBlocks = [...currentBlocks, newBlock];

                    updateAnimatingState(targetFileId, currentBlocks);

                    if (block.type !== 'table') {
                        const chars = block.content.split('');
                        for (let i = 0; i <= chars.length; i++) {
                            if (!mountedRef.current) return;
                            newBlock.content = block.content.slice(0, i);
                            // Force update last block
                            currentBlocks[currentBlocks.length - 1] = { ...newBlock };
                            updateAnimatingState(targetFileId, currentBlocks);

                            // Auto-scroll editor if active
                            if (activeFileId === targetFileId && scrollContainerRef.current) {
                                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                            }
                            await wait(12); // Typing speed
                        }
                    } else {
                        await wait(300); // Table fetch delay
                    }
                    await wait(50);
                }

                // Save final state
                setAllFileContents(prev => ({ ...prev, [targetFileId]: currentBlocks }));
            }
        }

        // Finish
        setChatMessages(prev => [...prev, { id: "done", role: "assistant", content: scenario.completionText }]);
        setShowReplay(true);
        animatingFileRef.current = null;
    };

    // Helper to handle append/overwrite logic for streaming
    const appendModeRefCheck = (fileId: string, append: boolean) => {
        if (append) {
            const existing = allFileContents[fileId] || [];
            animatingBlocksRef.current = [...existing];
            return [...existing];
        } else {
            animatingBlocksRef.current = [];
            return [];
        }
    };

    const updateAnimatingState = (fileId: string, blocks: ContentBlock[]) => {
        animatingBlocksRef.current = blocks;
        if (activeFileId === fileId) {
            setBlocks([...blocks]);
        }
    };

    useEffect(() => {
        mountedRef.current = false;
        setIsLoading(true);

        const timer = setTimeout(() => {
            mountedRef.current = true;
            setIsLoading(false);
            runAnimation();
        }, 500);

        return () => {
            mountedRef.current = false;
            clearTimeout(timer);
        };
    }, [activeScenarioId]);

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);


    // --- Render Helpers ---

    const activeFile = files.flatMap(f => [f, ...(f.children || [])]).find(f => f.id === activeFileId);

    const renderFileIcon = (item: FileSystemItem) => {
        if (item.icon === 'zoom') return <ZoomIcon className="w-3.5 h-3.5 text-[#2D8CFF]" />;
        if (item.icon === 'slack') return <SlackIcon className="w-3.5 h-3.5 text-[#4A154B]" />;
        if (item.icon === 'jira') return <JiraIcon className="w-3.5 h-3.5 text-[#0052CC]" />;
        if (item.icon === 'notebook') return <BookOpen className="w-3.5 h-3.5 text-amber-600" />;
        if (item.icon === 'globe') return <Globe2 className="w-3.5 h-3.5 text-emerald-600" />;
        if (item.icon === 'manuscript') return <FileText className="w-3.5 h-3.5 text-violet-600" />;
        if (item.icon === 'pen') return <PenTool className="w-3.5 h-3.5 text-rose-500" />;
        return <span className="material-symbols-outlined text-[16px] text-gray-400">description</span>;
    };

    const renderFolderIcon = (item: FileSystemItem) => {
        return <span className="material-symbols-outlined text-[16px] text-gray-400">folder</span>;
    };

    const renderToolIcon = (toolName: string) => {
        if (toolName === 'zoom_transcript') return <ZoomIcon className="w-3 h-3 text-[#2D8CFF]" />;
        if (toolName === 'slack_search') return <SlackIcon className="w-3 h-3 text-[#4A154B]" />;
        if (toolName === 'jira_search') return <JiraIcon className="w-3 h-3 text-[#0052CC]" />;
        if (toolName === 'read_notes') return <BookOpen className="w-3 h-3 text-amber-600" />;
        if (toolName === 'consult_writer') return <PenTool className="w-3 h-3 text-rose-500" />;
        return <span className="material-symbols-outlined text-[14px]">search</span>;
    };

    return (
        <div className="flex w-full h-full bg-white items-stretch text-left font-sans text-[#111318] relative">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center fade-in duration-200">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
            )}

            {/* Sidebar */}
            <div className="w-56 flex-none border-r border-[#e5e7eb] bg-[#f9fafb] flex-col hidden md:flex">
                <div className="p-3 border-b border-[#f3f4f6]">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white transition-colors cursor-default">
                        <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-[10px] font-bold">W</div>
                        <span className="text-sm font-medium text-gray-700 truncate">Workspace</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                    </div>
                </div>
                <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sources</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {files.map((item) => (
                        <div key={item.id}>
                            <div
                                onClick={() => item.type === "folder" && handleFolderToggle(item.id)}
                                className="flex items-center gap-1.5 px-2 py-1.5 text-gray-600 hover:bg-white rounded-md cursor-pointer text-[13px] font-medium select-none transition-colors"
                            >
                                {item.type === "folder" && (
                                    <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", !item.isOpen && "-rotate-90")} />
                                )}
                                {item.type === "folder" ? renderFolderIcon(item) : renderFileIcon(item)}
                                <span className="truncate">{item.name}</span>
                            </div>
                            {item.isOpen && item.children?.map(child => (
                                <div
                                    key={child.id}
                                    onClick={() => handleFileClick(child.id)}
                                    className={cn(
                                        "ml-5 flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[13px] transition-colors select-none",
                                        activeFileId === child.id ? "bg-white shadow-sm border border-gray-200/60 text-gray-900 font-medium" : "text-gray-500 hover:bg-gray-100/50"
                                    )}
                                >
                                    {renderFileIcon(child)}
                                    <span className="truncate">{child.name}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="h-12 border-b border-[#e5e7eb] flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Menu className="w-4 h-4 text-gray-400 lg:hidden" />
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium text-gray-900 truncate max-w-[200px]">{activeFile?.name}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto relative bg-white" ref={scrollContainerRef}>
                    <div className="max-w-3xl mx-auto py-12 px-8 min-h-full">
                        {blocks.map((block, idx) => (
                            <div key={idx} className="animate-in fade-in duration-300 mb-4">
                                {block.type === 'h1' && <h1 className="text-3xl font-bold tracking-tight text-[#111318] mb-4 font-serif">{block.content}</h1>}
                                {block.type === 'h2' && <h2 className="text-xl font-bold tracking-tight text-[#111318] mt-6 mb-3 font-serif">{block.content}</h2>}
                                {block.type === 'p' && <p className="text-[15px] leading-7 text-[#374151] mb-3">{block.content}</p>}
                                {block.type === 'quote' && (
                                    <blockquote className="border-l-3 border-[#2D8CFF] bg-[#2D8CFF]/5 pl-4 py-3 pr-4 rounded-r-lg text-[14px] italic text-[#374151] my-4">
                                        {block.content}
                                    </blockquote>
                                )}
                                {block.type === 'ul' && (
                                    <ul className="list-disc pl-5 mb-3 text-[15px] leading-7 text-[#374151] space-y-1">
                                        {block.content.split('\n').map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                )}
                                {block.type === 'table' && (() => {
                                    try {
                                        const data = JSON.parse(block.content);
                                        return (
                                            <div className="border border-gray-200 rounded-lg overflow-hidden my-4 shadow-sm">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-[#f9fafb] text-gray-500 font-medium border-b border-gray-200">
                                                        <tr>{data[0].map((h: any, i: any) => <th key={i} className="px-4 py-2">{h}</th>)}</tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {data.slice(1).map((r: any[], i: any) => (
                                                            <tr key={i} className="hover:bg-gray-50">
                                                                {r.map((c: string, j: any) => <td key={j} className="px-4 py-2 text-gray-700">{c}</td>)}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    } catch { return null; }
                                })()}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat Panel */}
            <div className="w-80 flex-none border-l border-[#e5e7eb] bg-white flex-col hidden xl:flex">
                <div className="h-12 border-b border-[#e5e7eb] flex items-center justify-between px-4">
                    <span className="text-sm font-semibold text-gray-900">Agent</span>
                    <div className="flex gap-1">
                        <History className="w-4 h-4 text-gray-400" />
                        <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                    {chatMessages.length === 0 && (
                        <div className="text-center mt-10 space-y-2">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto">
                                <Sparkles className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-400">Ready to help.</p>
                        </div>
                    )}

                    {chatMessages.map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col gap-1 text-sm animate-in slide-in-from-bottom-2 fade-in", msg.role === "user" ? "items-end" : "items-start")}>
                            {msg.role === "user" ? (
                                <div className="px-3 py-2 rounded-xl max-w-[90%] bg-gray-100 text-gray-900 rounded-br-none">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className="space-y-2 w-full">
                                    {/* Thinking Block */}
                                    {msg.isThinking && (
                                        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100/50">
                                            <div className="flex items-center gap-1.5 mb-2 text-gray-400 font-medium">
                                                <BrainCircuit className="w-3.5 h-3.5" />
                                                <span>Thinking...</span>
                                            </div>
                                            <div className="pl-5 border-l border-gray-200">
                                                {msg.content?.split('\n').map((line, i) => (
                                                    <div key={i} className="mb-1">{line}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tool Call */}
                                    {msg.toolCall && (
                                        <div className={cn(
                                            "bg-white border rounded-lg p-3 text-xs shadow-sm transition-all duration-300",
                                            `border-l-2 ${msg.toolCall.status === "running" ? "border-l-gray-300" : "border-l-black"} border-gray-200`
                                        )}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {msg.toolCall.status === "running" ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                                ) : (
                                                    <Check className="w-3.5 h-3.5 text-black" />
                                                )}
                                                {renderToolIcon(msg.toolCall.name)}
                                                <span className="font-medium text-gray-900">{msg.toolCall.name}</span>
                                            </div>
                                            <div className="font-mono text-gray-500 bg-gray-50 px-1.5 py-1 rounded mb-1 truncate text-[11px]">
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

                                    {/* Regular Message */}
                                    {msg.content && !msg.isThinking && (
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

                <div className="border-t border-[#e5e7eb]">
                    <div className="p-4">
                        <div className="relative">
                            <input type="text" value={chatInput} readOnly placeholder="Ask zerodraft..." className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none" />
                            <Send className="w-3.5 h-3.5 absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    {showReplay && (
                        <div className="px-4 pb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <button onClick={runAnimation} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                                <RotateCcw className="w-3 h-3" /> Replay Demo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
