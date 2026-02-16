import { ChatOpenAI } from "@langchain/openai";
import { traceable, getCurrentRunTree } from "langsmith/traceable";
import { Client } from "langsmith";
import { wrapOpenAI } from "langsmith/wrappers";
import OpenAI from "openai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

import { FileSystem } from "@/lib/server/file-system";
import { createClient } from "@/lib/supabase/server";
import {
    extractAndStoreReflections,
    fetchMemories,
    formatMemoriesForPrompt,
} from "@/lib/agent/reflection";
import { generatePlan, formatPlanForPrompt } from "@/lib/agent/planner";
import { webSearch } from "@/lib/agent/tools/web-search";

export const maxDuration = 300; // Allow up to 5 minutes for long generations

const langsmithClient = new Client();

// gets a history of all LLM calls in the thread to construct conversation history
async function getThreadHistory(threadId: string, projectName: string): Promise<any[]> {
    try {
        // Filter runs by the specific thread and project
        const filterString = `and(in(metadata_key, ["session_id", "thread_id"]), eq(metadata_value, "${threadId}"))`;

        // Only grab the LLM runs
        const runs: any[] = [];
        for await (const run of langsmithClient.listRuns({
            projectName: projectName,
            filter: filterString,
            runType: "llm"
        })) {
            if (run.run_type === "llm") {
                runs.push(run);
            }
        }

        // Sort by start time to get the most recent interaction
        runs.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

        // Check if we have any runs
        if (runs.length === 0) {
            return [];
        }

        // The current state of the conversation
        const latestRun = runs[0];
        const inputMessages = latestRun.inputs.messages || [];
        const outputMessage = latestRun.outputs?.choices?.[0]?.message || null;

        if (outputMessage) {
            return [...inputMessages, outputMessage];
        }
        return inputMessages;
    } catch (e) {
        console.error("Error fetching thread history:", e);
        return [];
    }
}

// File System Tools
const fsReadFile = tool(
    async () => "placeholder",
    {
        name: "fs_read_file",
        description: "Read the content of a file from the workspace. Use this when you need to see what's inside a specific file.",
        schema: z.object({
            path: z.string().describe("Path to the file (e.g., 'Specs/PRD.md' or 'notes.txt')")
        })
    }
);

const fsReadFileSection = tool(
    async () => "placeholder",
    {
        name: "fs_read_file_section",
        description: "Read a specific section of a file by line numbers. Use this to read part of a large file without loading the whole thing.",
        schema: z.object({
            file_path: z.string().describe("Relative path to the file"),
            start_line: z.number().int().min(1).default(1).describe("Start line (1-based)"),
            end_line: z.number().int().min(1).default(100).describe("End line (1-based)")
        })
    }
);

const summarizeFile = tool(
    async () => "placeholder",
    {
        name: "summarize_file",
        description: "Summarize the content of a file. Use this for large files (> 50 lines) to get the key points without filling your context window.",
        schema: z.object({
            file_path: z.string().describe("Relative path to the file"),
            focus: z.string().optional().describe("Specific aspect to focus on (e.g. 'requirements', 'architecture', 'TODOs')")
        })
    }
);

const fsWriteFile = tool(
    async () => "placeholder",
    {
        name: "fs_write_file",
        description: "Create a new file or completely overwrite an existing file. Use for creating documents or replacing files entirely.",
        schema: z.object({
            path: z.string().describe("Path to the file"),
            content: z.string().describe("Full content to write")
        })
    }
);

const fsAppendFile = tool(
    async () => "placeholder",
    {
        name: "fs_append_file",
        description: "Append content to an existing file. Use this for adding content to large files in chunks to avoid token limits.",
        schema: z.object({
            path: z.string().describe("Path to the file"),
            content: z.string().describe("Content to append")
        })
    }
);



const fsListDirectory = tool(
    async () => "placeholder",
    {
        name: "fs_list_directory",
        description: "List all files and folders in a directory.",
        schema: z.object({
            path: z.string().optional().describe("Directory path (defaults to root)")
        })
    }
);

// Writing/Editor Tools
const insertText = tool(
    async () => "placeholder",
    {
        name: "insert_text",
        description: "Insert text at the current cursor position in the editor. Use this for CREATING NEW CONTENT (generation, completion) where you are not replacing anything.",
        schema: z.object({
            text: z.string().describe("The text to insert at the cursor position")
        })
    }
);

const replaceSelection = tool(
    async () => "placeholder",
    {
        name: "replace_selection",
        description: "Replace the currently selected text with new text. Use when the user wants text rewritten or improved.",
        schema: z.object({
            new_text: z.string().describe("The new text to replace the selection with"),
            reason: z.string().optional().describe("Brief explanation of the change")
        })
    }
);

const suggestEdit = tool(
    async () => "placeholder",
    {
        name: "suggest_edit",
        description: "Propose an edit that the user can accept or reject. Finds `search_text` in the document and shows inline changes. For pure insertions, leave search_text empty. REQUIRED for the currently open file.",
        schema: z.object({
            search_text: z.string().describe("The exact text in the document to find and replace. Copy this verbatim from the document. Leave empty for pure insertions at the end."),
            replacement_text: z.string().describe("The new text to replace the found text with. Leave empty to propose deletion."),
            reason: z.string().optional().describe("Brief explanation for the edit")
        })
    }
);



const openFileInEditor = tool(
    async () => "placeholder",
    {
        name: "open_file_in_editor",
        description: "Open a file in the editor so you can make changes with suggest_edit. Use this BEFORE using suggest_edit if the file isn't already open.",
        schema: z.object({
            filename: z.string().describe("The name or path of the file to open")
        })
    }
);


// --- SPECIALIST TOOLS (Internal Only) ---

const consultWriter = tool(
    async () => "placeholder",
    {
        name: "consult_writer",
        description: "Ask the Specialist Writer to draft, rewrite, or edit content. use this for ALL creative writing tasks. The writer is better at prose than you are.",
        schema: z.object({
            instruction: z.string().describe("Specific instructions for the writer (e.g., 'Rewrite this paragraph to be more punchy', 'Draft an intro about...')"),
            context: z.string().optional().describe("The text to rewrite or relevant context"),
            tone: z.string().optional().describe("Desired tone (e.g., 'professional', 'witty', 'dark')")
        })
    }
);

const webSearchTool = tool(
    async () => "placeholder",
    {
        name: "web_search",
        description: "Search the web for real-time information. Use this when the user asks about current events, facts you're unsure about, research topics, or anything that requires up-to-date information.",
        schema: z.object({
            query: z.string().describe("The search query (be specific and concise)"),
            domains: z.array(z.string()).optional().describe("Optional list of domains to restrict search to (e.g. ['palantir.com']). Use this if the user asks to search a specific site.")
        })
    }
);

const planExecutionTool = tool(
    async () => "placeholder",
    {
        name: "plan_execution",
        description: "Analyze the user's request and generate a step-by-step execution plan. Use this for complex tasks, multi-file edits, or when the goal is ambiguous.",
        schema: z.object({
            focus: z.string().optional().describe("Optional area to focus the plan on (e.g., 'backend', 'UI', 'testing')")
        })
    }
);

// Internal tools are executed server-side (not sent to client)
const INTERNAL_TOOL_NAMES = ["consult_writer", "web_search", "summarize_file", "plan_execution"];

// Controller sees ALL tools, including the ability to consult the writer
const controllerTools = [
    // File system
    fsReadFile, fsReadFileSection, fsWriteFile, fsAppendFile, fsListDirectory, summarizeFile,
    // Editor/writing
    insertText, replaceSelection, suggestEdit, openFileInEditor,
    // Delegation & research
    consultWriter, webSearchTool, planExecutionTool
];

// Writer Logic
const writerSystemPrompt = `You are the **Lead Writer** for ZeroDraft.
Your ONLY job is to write exceptional, high-quality content based on the instructions provided.

## YOUR OPERATING RULES:
1. **Plain Text Only:** Return ONLY the raw text unless specifically asked for Markdown. **NEVER** wrap content in HTML tags (like <p>, <div>) unless explicitly requested.
2. **No Meta-Talk:** Do not say "Here is the draft:" or "I hope you like it." Just write the content.
3. **Be Brutal:** If the user asks for a critique, be precise and insightful. If asked to rewrite, make it significantly better.
4. **Context Aware:** Use the provided context to match the existing style (unless asked to change it).
5. **No Hallucinations:** Do not invent facts if the instruction implies factual accuracy, but feel free to be creative with fiction/prose.

You are the talent. The Controller handles the logistics. You simply Write.`;


// Helper to number lines for context
function numberLines(content: string): string {
    return content.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
}

// Build system prompt with workspace context
function buildControllerSystemPrompt(folderTree: string, currentFile: any | null, memory?: any): string {
    const hasOpenFile = currentFile !== null && currentFile !== undefined;

    return `You are **ZeroDraft Controller** — the orchestrator of the user's writing session.
You manage the workspace, navigate files, and — most importantly — **delegate creative work to your Specialist Writer.**

## MEMORY & CONTEXT RULE
Before calling \`fs_read_file\`:
1. **CHECK YOUR MESSAGE HISTORY.** Did you or the user already read this file in a previous turn?
2. If yes, **use the content from the history**. DO NOT re-read it.
3. Reading the same file twice is a waste of resources.

## SMART CONTEXT RULES (NEW)
1. **LARGE FILES (> 300 lines):**
   - **DO NOT** use \`fs_read_file\` to read the whole thing unless absolutely necessary.
   - Use \`summarize_file\` to get a high-level overview first.
   - Use \`fs_read_file_section\` to read specific parts (e.g., "lines 1-100" for imports/headers, or "lines 500-600" for a specific function).
2. **SPECIFIC LOOKUPS:**
   - If you need to check a specific function or config, use \`fs_read_file_section\`.
3. **ONLY** use \`fs_read_file\` for small files or when you need to perform a full global find-and-replace.
4. **NO BLIND BULK READS:**
   - If the user asks to "read the workspace" or "read all files", **DO NOT** blindly loop through every file.
   - **STOP** and ask for clarification: "I see [x] files. Would you like me to read all of them, or focus on specific ones?"
   - Exception: If the user explicitly says "Read all 5 files to understand the context", then you may proceed. But defaulting to reading 50 files is forbidden.

## YOUR ROLE
You do NOT write long-form content yourself. You are the project manager.
- **User wants a file?** -> You find it.
- **User wants to check a fact?** -> You read the file.
- **User wants to WRITE, DRAFT, or EDIT prose?** -> **You call \`consult_writer\`.**
- **User has a COMPLEX REQUEST (multi-step, ambiguous)?** -> **You call \`plan_execution\`.**

## PLANNING RULE (CRITICAL)
If the user's request involves multiple files, creating a complex feature, or is ambiguous:
1. **CALL \`plan_execution\` FIRST.**
2. Follow the steps provided by the planner.
3. Do NOT try to guess or wing it. Get a plan.

## THE SPECIALIST WRITER
You have a tool called \`consult_writer\`. USE IT.
The Writer is a specialized model tuned for high-quality prose. It is better than you at writing.
- **Input:** Give it clear instructions and the relevant text context.
- **Output:** It will return the raw text.
- **Action:** You then take that text and use \`suggest_edit\` or \`insert_text\` to put it in the document.

## WRITER DELEGATION RULE (CRITICAL)
You CANNOT generate long content yourself. You MUST use the Specialist Writer for ALL prose > 100 words.
If the user asks for a "comprehensive guide" or "long document":
1. **DIVIDE THE WORK:** Break it into SMALL, manageable chunks (e.g., "Introduction only", "Section 1 only").
   - **MAXIMUM 800 WORDS** per Writer call. Do not ask for the whole document at once.
   - **FORBIDDEN:** "Write Day 1, Day 2, and Day 3." -> **WRONG.** The Writer will generate too much text and CRASH.
   - **CORRECT:** "Write Day 1." -> Save. -> "Write Day 2." -> Append.
2. **ITERATE STRICTLY:**
   - **Step 1:** Call \`consult_writer\` for "Introduction" (max 800 words) -> Save to file (\`fs_write_file\`).
   - **Step 2:** Call \`consult_writer\` for "Section 1" (max 800 words) -> **APPEND** to file (\`fs_append_file\`).
   - **Step 3:** Call \`consult_writer\` for "Section 2" (max 800 words) -> **APPEND** to file (\`fs_append_file\`).
   - **Step 4:** Call \`notify_user\` to say "Done." -> STOP.
3. **NEVER** try to write the content yourself in \`fs_append_file\`. It will crash. Always ask the Writer first.

## CRITICAL RULES FOR EDITING
1. **HTML TRAP:** The user is likely writing in Markdown or plain text. **DO NOT** let the Writer (or yourself) inject HTML tags like <p> or <span> unless the file is explicitly an .html file.
2. **Text Addressing:** Use \`suggest_edit\` with \`search_text\` and \`replacement_text\`.
   - Copy the EXACT text you want to change into \`search_text\`. It must match verbatim.
   - Put the new text into \`replacement_text\`.
   - For pure insertions at end, leave \`search_text\` empty.
3. **OPEN FILE RULE:** 
   - **Modifying existing text?** -> Use \`suggest_edit\` with the exact text to find.
   - **Adding new text?** -> Use \`insert_text\` (at cursor) or \`suggest_edit\` with empty search_text.
   - DO NOT use \`fs_write_file\` on the open file. The system will block it.
   - If a file is NOT open, use \`open_file_in_editor\` first.

## DUPLICATE FILE CHECK (CRITICAL)
Before calling \`fs_write_file\`, ALWAYS check if the file already exists using \`fs_list_directory\`.
- If it exists, use \`fs_append_file\` to ADD content to it.
- NEVER create a second file with a different name for the SAME task.
- If you already created "Guide.md", do NOT create "Guide - Extensive.md" or "Guide (SDE2).md".
- **ONE DOCUMENT PER USER REQUEST. No exceptions.**

## STOPPING RULE
Once you have generated the full document (all sections written and saved), **YOU MUST STOP.**
Do not ask "Would you like me to add more?" or "I can expand on this."
Just confirm completion and wait for the user.

## LARGE CONTENT RULE (OUTPUT SAFETY)
Even with delegation, if you receive a large block of text (> 1000 words) from the Writer:
1. **DO NOT** try to write it all at once. You will crash.
2. **CHUNK IT:**
   - \`fs_write_file\` (first 800 words)
   - \`fs_append_file\` (next 800 words)
   - Repeat.
3. **Better yet:** Ask the Writer for smaller chunks in the first place.

## WORKSPACE CONTEXT
### Files
\\\`\\\`\\\`
${folderTree || "(empty workspace)"}
\\\`\\\`\\\`

${hasOpenFile ? `### Currently Open: \\\`${currentFile.name}\\\`
${currentFile.content ? `
\\\`\\\`\\\`
${numberLines(currentFile.content.slice(0, 10000))}
\\\`\\\`\\\`
` : '*(Content not loaded)*'}
` : `### No Document Open`}

${memory ? `### Memory
- **Goal:** ${memory.goal || 'Not specified'}
- **Audience:** ${memory.audience || 'Not specified'}
` : ''}
## COMMUNICATION STYLE (IMPORTANT)
You are NOT a silent robot. You are a helpful, conversational assistant.
**Between every tool call, provide a brief message explaining what you're doing and what you found.**
-"Great, I foundå your resume. Let me read through it to understand your background..."
- "Interesting — you have strong experience in fintech but limited people-management examples. Let me research questions around that gap..."
- "I've drafted the introduction section. Now I'll work on the STAR-format examples..."
- Do NOT just silently call tools without any chat message.
- Do NOT only say "Working..." or "Searching..."
Keep narration concise (1-2 sentences). Do NOT write essays between tool calls.

## EXECUTION RULES
1. **Analyze the Request:** Understand the goal and constraints.
2. **Complex?** -> Call \`plan_execution\` first.
3. **No Research Loops:** Do not search for the same topic twice. If you have enough info, START WRITING.
4. **Handle Facts:** If a file read fails, do not assume it exists. Check the file list or ask the user.
5. **Output Handling:** DO NOT output the Writer's text in your chat response. You MUST use \`suggest_edit\` or \`insert_text\` to put it in the file.
6. **Creative Writing:** If the user wants to WRITE/DRAFT -> Call \`consult_writer\`.
7. **Task Handling:** If the user asks for a task you can't do, explain why.

## EXECUTION
1. Analyze the Request.
2. If complex -> Call \`plan_execution\`.
3. If it requires creative writing/editing -> Call \`consult_writer\`.
4. If it requires file ops -> Call \`fs_*\` tools.
5. Once you have the text from the Writer, apply it using \`suggest_edit\`. DO NOT copy it into the chat (unless the user explicitly asked for a chat answer).
`;
}

export async function POST(req: Request) {
    const { messages, model, toolResults, folderTree, currentFile, memoryContext, workspaceId, chatSessionId, contextFiles, webSearchEnabled = true } = await req.json();
    console.log("Chat Route Request:", { chatSessionId, workspaceId, model });

    // Ensure we have a session ID
    const effectiveSessionId = chatSessionId || crypto.randomUUID();
    console.log("Effective Session ID:", effectiveSessionId);

    const selectedModel = model || "anthropic/claude-3.5-sonnet";

    // 0. Get authenticated user for memory system
    let userId: string | null = null;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
    } catch {
        console.warn("[Memory] Could not get authenticated user, skipping memory.");
    }

    // 1. Controller Setup
    let systemPrompt = buildControllerSystemPrompt(folderTree || "", currentFile, undefined);
    if (contextFiles && contextFiles.length > 0) {
        systemPrompt += `\n\n### 📄 Additional Context Files\n`;
        for (const file of contextFiles) {
            systemPrompt += `\n**File:** \`${file.name}\` (${file.path})\n\`\`\`\n${file.content || 'No content available'}\n\`\`\`\n`;
        }
    }
    if (memoryContext) systemPrompt += memoryContext;

    // 1b. Inject long-term memories from past sessions
    let userMemories: Awaited<ReturnType<typeof fetchMemories>> = [];
    if (userId) {
        try {
            userMemories = await fetchMemories(userId, workspaceId);
            const memoryPromptSection = formatMemoriesForPrompt(userMemories);
            if (memoryPromptSection) {
                systemPrompt += memoryPromptSection;
            }
        } catch (err) {
            console.warn("[Memory] Failed to fetch memories:", err);
        }
    }

    // 1. Controller LLM (Orchestrator) - Uses env var or fast default
    // This model handles tool calls, file logic, and context understanding
    const controllerModelName = process.env.ORCHESTRATOR_MODEL || "anthropic/claude-3.5-sonnet";
    const controllerLLM = new ChatOpenAI({
        modelName: controllerModelName,
        temperature: 0, // Keep strict for tool use
        maxTokens: 12288, // Increased for large file writes
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
        tags: ["controller", "zerodraft"],
        metadata: { session_id: effectiveSessionId },
        timeout: 120000, // 2 minutes timeout for large context processing
    }).bindTools(controllerTools);



    // 2. Writer LLM (Creative) - Uses User Selected Model
    // This model generates the actual prose content
    const writerModelName = selectedModel;
    const writerLLM = new ChatOpenAI({
        modelName: writerModelName,
        temperature: 0.7, // Creative
        maxTokens: 8192,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
        tags: ["writer", "specialist", "zerodraft"],
        metadata: { session_id: effectiveSessionId },
        timeout: 120000, // 2 minutes timeout
    });

    const lcMessages: any[] = [new SystemMessage(systemPrompt)];

    // Reconstruct conversation history
    for (const msg of messages) {
        if (msg.role === "user") {
            lcMessages.push(new HumanMessage(msg.content));
        } else if (msg.role === "assistant") {
            if (msg.toolCalls) {
                lcMessages.push(new AIMessage({
                    content: msg.content || "",
                    tool_calls: msg.toolCalls.map((tc: any) => ({
                        id: tc.id,
                        name: tc.name, // client side might store different naming, ensure consistency
                        args: JSON.parse(tc.arguments)
                    }))
                }));
            } else {
                lcMessages.push(new AIMessage(msg.content || ""));
            }
        } else if (msg.role === "tool") {
            lcMessages.push(new ToolMessage({
                content: msg.content,
                tool_call_id: msg.tool_call_id,
            }));
        }
    }

    // Handle incoming client-side tool results
    if (toolResults && toolResults.length > 0) {
        // Check if the last message already has these tool calls (avoid duplicates)
        const lastMsg = lcMessages[lcMessages.length - 1];
        const lastToolCallIds = new Set(
            (lastMsg instanceof AIMessage && lastMsg.tool_calls)
                ? lastMsg.tool_calls.map((tc: any) => tc.id)
                : []
        );
        const alreadyHasToolCalls = toolResults.every((r: any) => lastToolCallIds.has(r.toolCallId));

        if (!alreadyHasToolCalls) {
            lcMessages.push(new AIMessage({
                content: "",
                tool_calls: toolResults.map((r: any) => ({
                    id: r.toolCallId,
                    name: r.toolName || "tool",
                    args: r.args || {}
                }))
            }));
        }
        for (const result of toolResults) {
            lcMessages.push(new ToolMessage({
                content: result.result,
                tool_call_id: result.toolCallId,
                name: result.toolName
            }));
        }
    }

    // ── Sanitize: ensure every AIMessage tool_call has a ToolMessage ──
    // Providers return 400 if a tool_call has no matching ToolMessage.
    const sanitized: any[] = [];
    for (let i = 0; i < lcMessages.length; i++) {
        sanitized.push(lcMessages[i]);
        const msg = lcMessages[i];
        if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
            // Collect all ToolMessage IDs that follow before the next non-Tool message
            const answeredIds = new Set<string>();
            for (let j = i + 1; j < lcMessages.length; j++) {
                if (lcMessages[j] instanceof ToolMessage) {
                    answeredIds.add((lcMessages[j] as any).tool_call_id);
                } else {
                    break;
                }
            }
            // Inject synthetic ToolMessages for any unanswered tool_calls
            for (const tc of msg.tool_calls) {
                if (!answeredIds.has(tc.id ?? "")) {
                    sanitized.push(new ToolMessage({
                        content: "(result not available)",
                        tool_call_id: tc.id ?? "",
                        name: tc.name,
                    }));
                }
            }
        }
    }
    // Replace lcMessages with sanitized version
    lcMessages.length = 0;
    lcMessages.push(...sanitized);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Filter tools based on feature flags
                const activeTools = webSearchEnabled
                    ? controllerTools
                    : controllerTools.filter(t => t.name !== "web_search");

                const controllerWithTools = controllerLLM.bindTools(activeTools);

                // --- THE AGENTIC LOOP ---

                // --- THE AGENTIC LOOP (Wrapped in traceable) ---
                const runAgenticLoop = traceable(async () => {
                    let loopCount = 0;
                    const MAX_LOOPS = 8;
                    let lastToolCallSignature = "";

                    while (loopCount < MAX_LOOPS) {
                        loopCount++;

                        // Invoke Controller with Retry Logic
                        let response;
                        let retryCount = 0;
                        while (true) {
                            try {
                                console.log(`[AgentLoop] Invoking controller (Loop ${loopCount})...`);
                                const startTime = Date.now();
                                response = await controllerWithTools.invoke(lcMessages);
                                console.log(`[AgentLoop] Controller response received in ${Date.now() - startTime}ms`);
                                break;
                            } catch (error) {
                                retryCount++;
                                if (retryCount >= 3) throw error;
                                console.warn(`[AgentLoop] Controller invocation failed, retrying (${retryCount}/3)...`);
                                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                            }
                        }

                        // Loop Detection
                        if (response.tool_calls && response.tool_calls.length > 0) {
                            const currentSignature = JSON.stringify(response.tool_calls.map((tc: any) => ({ name: tc.name, args: tc.args })));

                            // 1. Check local loop (within this request's execution loop)
                            if (currentSignature === lastToolCallSignature) {
                                console.warn(`[AgentLoop] Local loop detected! Stopping execution. Signature: ${currentSignature}`);
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: "I seem to be stuck in a loop repeating the same action. Stopping execution." })}\n\n`));
                                controller.close();
                                return;
                            }
                            lastToolCallSignature = currentSignature;

                            // 2. Check cross-request loop (compare with the last AI message in history)
                            // This catches cases where the agent returns to client, client executes, and agent calls exact same tool again.
                            for (let i = lcMessages.length - 1; i >= 0; i--) {
                                const msg = lcMessages[i];
                                if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
                                    const lastHistorySignature = JSON.stringify(msg.tool_calls.map((tc: any) => ({ name: tc.name, args: tc.args })));
                                    if (currentSignature === lastHistorySignature) {
                                        console.warn(`[AgentLoop] Cross-request loop detected! Stopping execution. Signature: ${currentSignature}`);
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: "I seem to be stuck in a loop repeating the same action. Stopping execution." })}\n\n`));
                                        controller.close();
                                        return;
                                    }
                                    // Only check the very last AI message with tools. If we go back further, we might block valid repeated actions like "write file" -> "user critique" -> "write file again".
                                    // We only want to block "write file" -> "write file" (immediate loop).
                                    break;
                                }
                            }
                        }


                        // Check for Tool Calls
                        if (response.tool_calls && response.tool_calls.length > 0) {
                            // Check if any tool call is internal (consult_writer, web_search)
                            const internalCalls = response.tool_calls.filter(tc => INTERNAL_TOOL_NAMES.includes(tc.name));
                            const externalCalls = response.tool_calls.filter(tc => !INTERNAL_TOOL_NAMES.includes(tc.name));

                            // If specialized Writer/Search tools are called, execute them SERVER SIDE
                            if (internalCalls.length > 0) {
                                // Add the assistant's tool calls to history
                                lcMessages.push(response);

                                for (const call of internalCalls) {
                                    // Stream "Tool Started" event
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                        type: "tool_start",
                                        name: call.name,
                                        toolCallId: call.id,
                                        args: call.args
                                    })}\n\n`));

                                    let toolOutput = "";

                                    try {
                                        if (call.name === "consult_writer") {
                                            // Execute Writer
                                            const args = call.args;
                                            const writerSystemPrompt = "You are an expert Ghost Writer.\n Your goal is to write high-quality content based on the user's request and the provided context.\n Return ONLY the written content. Do not include preamble or conversational filler.";
                                            const writerContext = `Instruction: ${args.instruction}\nContext: ${args.context || "None"}\nTone: ${args.tone || "Neutral"}`;

                                            const writerResponse = await writerLLM.invoke([
                                                new SystemMessage(writerSystemPrompt),
                                                new HumanMessage(writerContext)
                                            ]);
                                            toolOutput = typeof writerResponse.content === 'string' ? writerResponse.content : JSON.stringify(writerResponse.content);

                                        } else if (call.name === "summarize_file") {
                                            // Execute Summarize File
                                            const { file_path, focus } = call.args;
                                            try {
                                                const fs = new FileSystem(workspaceId);
                                                const content = await fs.readFile(file_path);

                                                // If small, just return it
                                                if (content.length < 3000) {
                                                    toolOutput = `File is small enough (${content.length} chars). Here is the content:\n${content}`;
                                                } else {
                                                    console.log(`[AgentLoop] Summarizing file ${file_path} (${content.length} chars)...`);
                                                    // Summarize using Writer LLM
                                                    const summaryPrompt = `Please summarize the following file content.${focus ? ` Focus on: ${focus}` : ""} Keep it under 300 words. Capture key technical details, requirements, and architecture points.\n\nFile: ${file_path}\nContent (truncated):\n${content.slice(0, 50000)}...`;
                                                    const summaryResponse = await writerLLM.invoke([
                                                        new SystemMessage("You are a technical documentation assistant. Summarize the provided text concisely but preserving key details."),
                                                        new HumanMessage(summaryPrompt)
                                                    ]);
                                                    toolOutput = typeof summaryResponse.content === 'string' ? summaryResponse.content : JSON.stringify(summaryResponse.content);
                                                }
                                            } catch (e: any) {
                                                toolOutput = `Error summarizing file: ${e.message}`;
                                            }

                                        } else if (call.name === "web_search") {
                                            // Execute Web Search
                                            toolOutput = await webSearch.invoke(call.args);

                                        } else if (call.name === "plan_execution") {
                                            const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
                                            const plan = await generatePlan(
                                                typeof lastUserMsg.content === "string" ? lastUserMsg.content : "",
                                                {
                                                    hasOpenFile: currentFile !== null && currentFile !== undefined,
                                                    openFileName: currentFile?.name,
                                                    hasSelection: false,
                                                    fileCount: folderTree ? folderTree.split("\n").length : 0,
                                                },
                                                effectiveSessionId
                                            );
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "planning", plan })}\n\n`));
                                            toolOutput = formatPlanForPrompt(plan);

                                        } else if (call.name === "fs_read_file") {
                                            const pathArg = call.args.path;
                                            console.log(`[AgentLoop] Read File: ${pathArg}`);

                                            // Check active file context first (LIVE UNSAVED CONTENT)
                                            const isCurrentFile = currentFile && pathArg && (
                                                pathArg === currentFile.path ||
                                                pathArg === currentFile.name ||
                                                pathArg.endsWith(`/${currentFile.name}`) ||
                                                currentFile.path?.endsWith(`/${pathArg}`) ||
                                                currentFile.name?.toLowerCase() === pathArg?.toLowerCase()
                                            );

                                            if (isCurrentFile) {
                                                console.log("[AgentLoop] Reading active file from request context");
                                                toolOutput = currentFile.content || "";
                                            } else {
                                                const fs = new FileSystem(workspaceId, await createClient());
                                                toolOutput = await fs.readFile(pathArg);
                                            }

                                        } else if (call.name === "fs_list_directory") {
                                            const fs = new FileSystem(workspaceId, await createClient());
                                            toolOutput = await fs.listFiles();

                                        } else if (call.name === "fs_read_file_section") {
                                            // Simplified section reading
                                            const pathArg = call.args.file_path;
                                            const startLine = call.args.start_line;
                                            const endLine = call.args.end_line;

                                            let fullContent = "";
                                            const isCurrentFile = currentFile && pathArg && (
                                                pathArg === currentFile.path ||
                                                pathArg === currentFile.name ||
                                                pathArg.endsWith(`/${currentFile.name}`) ||
                                                currentFile.path?.endsWith(`/${pathArg}`) ||
                                                currentFile.name?.toLowerCase() === pathArg?.toLowerCase()
                                            );

                                            if (isCurrentFile) {
                                                fullContent = currentFile.content || "";
                                            } else {
                                                const fs = new FileSystem(workspaceId, await createClient());
                                                fullContent = await fs.readFile(pathArg);
                                            }

                                            const lines = fullContent.split('\n');
                                            toolOutput = lines.slice(Math.max(0, startLine - 1), endLine).join('\n');

                                        } else if (call.name === "fs_search_file_content") {
                                            const fs = new FileSystem(workspaceId, await createClient());
                                            toolOutput = await fs.searchContent(call.args.query);

                                        } else if (call.name === "fs_search_files") {
                                            const fs = new FileSystem(workspaceId, await createClient());
                                            toolOutput = await fs.findFiles(call.args.pattern);

                                        } else if (call.name === "fs_read_file_outline") {
                                            const pathArg = call.args.file_path;
                                            const fs = new FileSystem(workspaceId, await createClient());
                                            const content = await fs.readFile(pathArg);
                                            const lines = content.split('\n');
                                            toolOutput = "File Outline (first 50 lines):\n" + lines.slice(0, 50).join('\n') + "\n...(rest of file omitted)";
                                        }

                                    } catch (err: any) {
                                        console.error(`[AgentLoop] Error executing internal tool ${call.name}:`, err);
                                        toolOutput = `Error executing tool: ${err.message}`;
                                    }

                                    // Stream "Tool Result" event
                                    const truncatedResult = call.name === "web_search"
                                        ? `Found ${(toolOutput.match(/\*\*/g) || []).length / 2} results for "${call.args.query}"`
                                        : call.name === "consult_writer"
                                            ? `Writer produced ${toolOutput.split(/\s+/).length} words`
                                            : call.name === "plan_execution"
                                                ? "Plan generated"
                                                : toolOutput.slice(0, 100);

                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                        type: "tool_result",
                                        toolCallId: call.id,
                                        name: call.name,
                                        result: truncatedResult,
                                        full_content: toolOutput
                                    })}\n\n`));

                                    lcMessages.push(new ToolMessage({
                                        tool_call_id: call.id!,
                                        content: toolOutput,
                                        name: call.name
                                    }));
                                }
                                console.log(`[AgentLoop] Finished internal tools (Loop ${loopCount}). Continuing loop...`);
                                // Loop continues! Controller receives the results and decides what to do next.

                            }
                            if (internalCalls.length === 0) {
                                // If only external tools (fs_*, suggest_edit), return to Client
                                // Fire background reflection (non-blocking)
                                if (userId) {
                                    const snippet = messages.slice(-4).map((m: any) => `${m.role}: ${typeof m.content === 'string' ? m.content.slice(0, 500) : ''}`).join('\n');
                                    // extractAndStoreReflections(userId, workspaceId, snippet, userMemories, chatSessionId).catch(() => { });
                                }

                                // Stream "Tool Calls" event for client to execute
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    type: "tool_calls",
                                    toolCalls: externalCalls.map(tc => ({
                                        id: tc.id,
                                        name: tc.name,
                                        args: tc.args
                                    })),
                                    content: typeof response.content === "string" ? response.content : ""
                                })}\n\n`));

                                controller.close();
                                console.log(`[AgentLoop] Yielding to client for external tools (Loop ${loopCount}).`);
                                return;
                            }
                        } else {

                            // No tools called -> Send the final text response (already generated by invoke)
                            const content = typeof response.content === "string" ? response.content : "";

                            // Fire background reflection (non-blocking)
                            if (userId) {
                                const snippet = messages.slice(-4).map((m: any) => `${m.role}: ${typeof m.content === 'string' ? m.content.slice(0, 500) : ''}`).join('\n');
                                // extractAndStoreReflections(userId, workspaceId, snippet, userMemories, chatSessionId).catch(() => { });
                            }

                            if (content) {
                                // Send token by token simulating stream or just send it all
                                // For better UX with typing effect on client, we could split it, 
                                // but sending it all at once is fine and faster.
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`));
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
                            controller.close();
                            console.log(`[AgentLoop] Final response sent (Loop ${loopCount}). Done.`);
                            return;
                        }
                    }


                    // Fallback if loop limit reached
                    console.warn(`[AgentLoop] Limit reached (Loop ${loopCount}). Sending error.`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: "Agent iteration limit reached." })}\n\n`));
                    controller.close();

                }, {
                    name: "Agent Loop",
                    metadata: { session_id: effectiveSessionId },
                    project_name: process.env.LANGCHAIN_PROJECT || "Zerodraft"
                });

                await runAgenticLoop();

            } catch (error: any) {
                console.error("Chat API error:", error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: error.message || "Unknown error" })}\n\n`));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

