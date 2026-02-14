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

// Internal tools are executed server-side (not sent to client)
const INTERNAL_TOOL_NAMES = ["consult_writer", "web_search"];

// Controller sees ALL tools, including the ability to consult the writer
const controllerTools = [
    // File system
    fsReadFile, fsWriteFile, fsAppendFile, fsListDirectory,
    // Editor/writing
    insertText, replaceSelection, suggestEdit, openFileInEditor,
    // Delegation & research
    consultWriter, webSearchTool
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

## YOUR ROLE
You do NOT write long-form content yourself. You are the project manager.
- **User wants a file?** -> You find it.
- **User wants to check a fact?** -> You read the file.
- **User wants to WRITE, DRAFT, or EDIT prose?** -> **You call \`consult_writer\`.**

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
- ✅ "Great, I found your resume. Let me read through it to understand your background..."
- ✅ "Interesting — you have strong experience in fintech but limited people-management examples. Let me research questions around that gap..."
- ✅ "I've drafted the introduction section. Now I'll work on the STAR-format examples..."
- ❌ Do NOT just silently call tools without any chat message.
- ❌ Do NOT only say "Working..." or "Searching..."
Keep narration concise (1-2 sentences). Do NOT write essays between tool calls.

## EXECUTION RULES
1. **Analyze the Request:** Understand the goal and constraints.
2. **No Research Loops:** Do not search for the same topic twice. If you have enough info, START WRITING.
3. **Handle Facts:** If a file read fails, do not assume it exists. Check the file list or ask the user.
4. **Output Handling:** DO NOT output the Writer's text in your chat response. You MUST use \`suggest_edit\` or \`insert_text\` to put it in the file.
5. **Creative Writing:** If the user wants to WRITE/DRAFT -> Call \`consult_writer\`.
6. **Task Handling:** If the user asks for a task you can't do, explain why.

## EXECUTION
1. Analyze the Request.
2. If it requires creative writing/editing -> Call \`consult_writer\`.
3. If it requires file ops -> Call \`fs_*\` tools.
4. Once you have the text from the Writer, apply it using \`suggest_edit\`. DO NOT copy it into the chat (unless the user explicitly asked for a chat answer).
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



    // Use the selected model for the Controller (it needs to be smart enough to use tools)
    const controllerLLM = new ChatOpenAI({
        modelName: selectedModel,
        temperature: 0, // Strict for logic
        maxTokens: 8192,
        tags: ["controller", "zerodraft"],
        metadata: {
            session_id: effectiveSessionId,
        },
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
    });

    // 2. Writer Setup (Can use a different model or the same one with higher temp)
    // For now, we use the same model but with a specialized prompt and higher temperature for creativity
    const writerLLM = new ChatOpenAI({
        modelName: selectedModel, // Or "anthropic/claude-3-opus" if available/context allows
        temperature: 0.7, // Creative for writing
        maxTokens: 8192,
        tags: ["writer", "specialist", "zerodraft"],
        metadata: {
            session_id: effectiveSessionId,
        },
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
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
        lcMessages.push(new AIMessage({
            content: "",
            tool_calls: toolResults.map((r: any) => ({
                id: r.toolCallId,
                name: r.toolName || "tool",
                args: r.args || {}
            }))
        }));
        for (const result of toolResults) {
            lcMessages.push(new ToolMessage({
                content: result.result,
                tool_call_id: result.toolCallId,
                name: result.toolName
            }));
        }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 1c. Generate execution plan (streaming)
                if (!toolResults || toolResults.length === 0) {
                    try {
                        const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
                        if (lastUserMsg) {
                            const plan = await generatePlan(
                                typeof lastUserMsg.content === "string" ? lastUserMsg.content : "",
                                {
                                    hasOpenFile: currentFile !== null && currentFile !== undefined,
                                    openFileName: currentFile?.name,
                                    hasSelection: false,
                                    fileCount: folderTree ? folderTree.split("\n").length : 0,
                                },
                                effectiveSessionId // Pass threadId
                            );

                            // Stream "Planning" event
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "planning", plan })}\n\n`));

                            // Update System Prompt with Plan
                            const planText = formatPlanForPrompt(plan);
                            if (lcMessages[0] instanceof SystemMessage) {
                                lcMessages[0] = new SystemMessage(`${lcMessages[0].content}\n\n${planText}`);
                            }
                        }
                    } catch (err) {
                        console.warn("[Planner] Failed to generate plan:", err);
                    }
                }

                // Filter tools based on feature flags
                const activeTools = webSearchEnabled
                    ? controllerTools
                    : controllerTools.filter(t => t.name !== "web_search");

                const controllerWithTools = controllerLLM.bindTools(activeTools);

                // --- THE AGENTIC LOOP ---

                // --- THE AGENTIC LOOP (Wrapped in traceable) ---
                const runAgenticLoop = traceable(async () => {
                    let loopCount = 0;
                    const MAX_LOOPS = 20;

                    while (loopCount < MAX_LOOPS) {
                        loopCount++;

                        // Invoke Controller
                        // We use invoke() because we need to see if it calls tools or returns text.
                        // If we wanted to stream the "thinking" (text before tool call), update this to stream.
                        const response = await controllerWithTools.invoke(lcMessages);

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

                                    if (call.name === "consult_writer") {
                                        // Execute Writer
                                        const args = call.args;
                                        const writerContext = `Instruction: ${args.instruction}\nContext: ${args.context || "None"}\nTone: ${args.tone || "Neutral"}`;

                                        const writerResponse = await writerLLM.invoke([
                                            new SystemMessage(writerSystemPrompt),
                                            new HumanMessage(writerContext)
                                        ]);
                                        toolOutput = typeof writerResponse.content === 'string' ? writerResponse.content : JSON.stringify(writerResponse.content);

                                    } else if (call.name === "web_search") {
                                        // Execute Web Search
                                        toolOutput = await webSearch(call.args.query, 5, call.args.domains);
                                    }

                                    // Stream "Tool Result" event
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                        type: "tool_result",
                                        toolCallId: call.id,
                                        result: toolOutput // You might want to truncate this if it's huge, but for search it's needed
                                    })}\n\n`));

                                    lcMessages.push(new ToolMessage({
                                        tool_call_id: call.id!,
                                        content: toolOutput,
                                        name: call.name
                                    }));
                                }
                                // Loop continues! Controller receives the results and decides what to do next.
                                continue;
                            }

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
                            return;
                        }

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
                        return;
                    }

                    // Fallback if loop limit reached
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

