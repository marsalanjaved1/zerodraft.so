import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

import { FileSystem } from "@/lib/server/file-system";

export const maxDuration = 300; // Allow up to 5 minutes for long generations

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

const fsUpdateFile = tool(
    async () => "placeholder",
    {
        name: "fs_update_file",
        description: "Update a file by finding and replacing specific text. Use for surgical edits to existing documents. DO NOT use this for the currently open file (use suggest_edit instead).",
        schema: z.object({
            path: z.string().describe("Path to the file"),
            search_text: z.string().describe("Exact text to find"),
            replacement_text: z.string().describe("Text to replace with")
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
        description: "Propose an edit that the user can accept or reject. REQUIRED for the currently open file. If the text appears multiple times, call this tool multiple times (once for each instance).",
        schema: z.object({
            original_text: z.string().describe("The original text to replace (must match exactly)"),
            suggested_text: z.string().describe("The suggested replacement text"),
            reason: z.string().optional().describe("Explanation for the edit")
        })
    }
);

const suggestInsertion = tool(
    async () => "placeholder",
    {
        name: "suggest_insertion",
        description: "Propose new text to INSERT at a specific location. Use this for adding NEW content (rows, paragraphs) without replacing anything. Returns green text with accept/reject buttons.",
        schema: z.object({
            insertion_point: z.string().describe("The exact text pattern to locate the insertion point. The new text will be inserted AFTER this text."),
            text_to_insert: z.string().describe("The new text to add"),
            reason: z.string().optional().describe("Explanation for the addition")
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

// Controller sees ALL tools, including the ability to consult the writer
const controllerTools = [
    // File system
    fsReadFile, fsWriteFile, fsUpdateFile, fsListDirectory,
    // Editor/writing
    insertText, replaceSelection, suggestEdit, suggestInsertion, openFileInEditor,
    // Delegation
    consultWriter
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


// Build system prompt with workspace context
function buildControllerSystemPrompt(folderTree: string, currentFile: any | null, memory?: any): string {
    const hasOpenFile = currentFile !== null && currentFile !== undefined;

    return `You are **ZeroDraft Controller** — the orchestrator of the user's writing session.
You manage the workspace, navigate files, and — most importantly — **delegate creative work to your Specialist Writer.**

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

## CRITICAL RULES FOR EDITING
1. **HTML TRAP:** The user is likely writing in Markdown or plain text. **DO NOT** let the Writer (or yourself) inject HTML tags like \`<p>\` or \`<span>\` unless the file is explicitly an .html file.
2. **Exact Matching:** usage of \`suggest_edit\` requires EXACT matching of \`original_text\`. 
   - Copy the text *exactly* from the file content provided below.
   - If the Writer returns a new version, make sure you know exactly where it goes.
3. **OPEN FILE RULE:** 
   - **Modifying existing text?** -> Use \`suggest_edit\`. matches \`original_text\` EXACTLY.
   - **Adding new text?** -> Use \`insert_text\`. Puts text at the cursor.
   - DO NOT use \`fs_update_file\` or \`fs_write_file\` on the open file. The system will block it.
   - For background files (not open), you MAY use \`fs_update_file\`.

## WORKSPACE CONTEXT
### Files
\`\`\`
${folderTree || "(empty workspace)"}
\`\`\`

${hasOpenFile ? `### Currently Open: \`${currentFile.name}\`
${currentFile.content ? `
\`\`\`
${currentFile.content.slice(0, 10000)}
\`\`\`
` : '*(Content not loaded)*'}
` : `### No Document Open`}

${memory ? `### Memory
- **Goal:** ${memory.goal || 'Not specified'}
- **Audience:** ${memory.audience || 'Not specified'}
` : ''}

## EXECUTION
1. Analyze the Request.
2. If it requires creative writing/editing -> Call \`consult_writer\`.
3. If it requires file ops -> Call \`fs_*\` tools.
4. Once you have the text from the Writer, apply it using \`suggest_edit\` (if changing text) or \`insert_text\` (if adding new text).
`;
}

export async function POST(req: Request) {
    const { messages, model, toolResults, folderTree, currentFile, memoryContext, workspaceId, contextFiles } = await req.json();
    const selectedModel = model || "anthropic/claude-3.5-sonnet";

    // 1. Controller Setup
    let systemPrompt = buildControllerSystemPrompt(folderTree || "", currentFile, undefined);
    if (contextFiles && contextFiles.length > 0) {
        systemPrompt += `\n\n### 📄 Additional Context Files\n`;
        for (const file of contextFiles) {
            systemPrompt += `\n**File:** \`${file.name}\` (${file.path})\n\`\`\`\n${file.content || 'No content available'}\n\`\`\`\n`;
        }
    }
    if (memoryContext) systemPrompt += memoryContext;

    // Use the selected model for the Controller (it needs to be smart enough to use tools)
    const controllerLLM = new ChatOpenAI({
        modelName: selectedModel,
        temperature: 0, // Strict for logic
        maxTokens: 4096,
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
        maxTokens: 4096,
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

    try {
        const controllerWithTools = controllerLLM.bindTools(controllerTools);

        // --- THE AGENTIC LOOP ---
        let loopCount = 0;
        const MAX_LOOPS = 5;
        let finalStream = null;
        let finalEncodedResponse = null;

        while (loopCount < MAX_LOOPS) {
            loopCount++;

            // Invoke Controller
            const response = await controllerWithTools.invoke(lcMessages);

            // Check for Tool Calls
            if (response.tool_calls && response.tool_calls.length > 0) {
                // Check if any tool call is internal (consult_writer)
                const internalCalls = response.tool_calls.filter(tc => tc.name === "consult_writer");
                const externalCalls = response.tool_calls.filter(tc => tc.name !== "consult_writer");

                // If specialized Writer tools are called, execute them SERVER SIDE
                if (internalCalls.length > 0) {
                    // Add the assistant's "consult_writer" call to history
                    lcMessages.push(response);

                    for (const call of internalCalls) {
                        // Execute Writer
                        const args = call.args;
                        const writerContext = `Instruction: ${args.instruction}\nContext: ${args.context || "None"}\nTone: ${args.tone || "Neutral"}`;

                        const writerResponse = await writerLLM.invoke([
                            new SystemMessage(writerSystemPrompt),
                            new HumanMessage(writerContext)
                        ]);

                        // Add Writer's result as a Tool Output
                        lcMessages.push(new ToolMessage({
                            tool_call_id: call.id!,
                            content: typeof writerResponse.content === 'string' ? writerResponse.content : JSON.stringify(writerResponse.content),
                            name: "consult_writer"
                        }));
                    }
                    // Loop continues! Controller receives the Writer's draft and decides what to do next.
                    continue;
                }

                // If only external tools (fs_*, suggest_edit), return to Client
                return Response.json({
                    type: "tool_calls",
                    toolCalls: externalCalls.map(tc => ({
                        id: tc.id,
                        name: tc.name,
                        args: tc.args
                    })),
                    content: typeof response.content === "string" ? response.content : ""
                });
            }

            // No tools called -> Stream the final text response
            const streamResponse = await controllerWithTools.stream(lcMessages);
            const encoder = new TextEncoder();

            return new Response(
                new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of streamResponse) {
                                const content = typeof chunk.content === "string" ? chunk.content : "";
                                if (content) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`));
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
                            controller.close();
                        } catch (streamError: any) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: streamError.message })}\n\n`));
                            controller.close();
                        }
                    }
                }),
                {
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                }
            );
        }

        // Fallback if loop limit reached
        return Response.json({ type: "error", content: "Agent iteration limit reached." }, { status: 500 });

    } catch (error: any) {
        console.error("Chat API error:", error);
        return Response.json({
            type: "error",
            content: `Error: ${error.message}`
        }, { status: 500 });
    }
}
