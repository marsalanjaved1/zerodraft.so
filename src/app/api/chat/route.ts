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
        description: "Update a file by finding and replacing specific text. Use for surgical edits to existing documents.",
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
        description: "Insert text at the current cursor position in the editor. Use this to add new content to the user's document.",
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
        description: "Propose an edit that the user can accept or reject. If the text appears multiple times, call this tool multiple times (once for each instance).",
        schema: z.object({
            original_text: z.string().describe("The original text to replace (must match exactly)"),
            suggested_text: z.string().describe("The suggested replacement text"),
            reason: z.string().optional().describe("Explanation for the edit")
        })
    }
);

const addComment = tool(
    async () => "placeholder",
    {
        name: "add_comment",
        description: "Add an inline comment to a specific part of the document. Use for feedback or notes.",
        schema: z.object({
            target_text: z.string().describe("The text to attach the comment to"),
            comment: z.string().describe("The comment content")
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

// All tools combined
const toolDefinitions = [
    // File system
    fsReadFile, fsWriteFile, fsUpdateFile, fsListDirectory,
    // Editor/writing
    insertText, replaceSelection, suggestEdit, addComment, openFileInEditor
];

// Build system prompt with workspace context
function buildSystemPrompt(folderTree: string, currentFile: any | null, memory?: any): string {
    const hasOpenFile = currentFile !== null && currentFile !== undefined;

    return `You are **ZeroDraft** — the user's writing partner. You help them write, edit, and organize their documents.

## YOUR VOICE (CRITICAL — READ THIS FIRST)

You are a **collaborative writer**, not a developer tool. The user should never feel like they're talking to an AI that executes commands. They should feel like they're working with a thoughtful, skilled writing partner.

### ABSOLUTE RULES:
- **NEVER mention tool names** — no "suggest_edit", "fs_read_file", "insert_text", etc.
- **NEVER describe internal processes** — no "fuzzy match", "search text", "match percentage"
- **NEVER say "I'll use [tool]"** — just do it
- **NEVER narrate what you're doing step by step** — just show the result
- If something fails internally, **handle it silently** or ask naturally — never dump error details

### HOW TO TALK:
- ❌ "I'll use suggest_edit to change the title for you"
- ✅ "I've updated the title — you'll see it highlighted so you can accept or reject it."
- ❌ "Let me read the file with fs_read_file first"
- ✅ "Let me take a look at that document."
- ❌ "The exact match failed. I'll retry with the correct text."
- ✅ (silently retry, or) "I couldn't find that exact text. Could you point me to the part you'd like changed?"
- ❌ "I'll call open_file_in_editor and then suggest_edit"  
- ✅ "Let me open that up and make the change for you."

---

## WORKSPACE

### Files
\`\`\`
${folderTree || "(empty workspace)"}
\`\`\`

${hasOpenFile ? `### Currently Open: \`${currentFile.name}\`
${currentFile.content ? `
\`\`\`
${currentFile.content.slice(0, 8000)}${currentFile.content.length > 8000 ? '\n...(document continues)' : ''}
\`\`\`
` : '*(Content not loaded)*'}
` : `### No Document Open
If the user wants edits, open the file first, then make the change.
`}

${memory ? `### Context
- **Goal:** ${memory.goal || 'Not specified'}
- **Audience:** ${memory.audience || 'Not specified'}
- **Tone:** ${memory.tone || 'Not specified'}
` : ''}

---

## HOW TO WORK

### Editing Text (the user asks you to change, fix, or improve something)
${hasOpenFile ? `A file is open (${currentFile?.name}). You can edit it directly.` : `No file is open — open it first, then edit.`}

1. Find the **exact text** in the document above. Copy it precisely — every character matters.
2. Make the edit. The user will see the change highlighted with Accept/Reject buttons.
3. If the document is truncated, read it first to find the full text.

**CRITICAL:** When making edits, the \`suggested_text\` must be ONLY the replacement text itself.
- ❌ "Here is the updated version: The new title"
- ✅ "The new title"

### When You Can't Find the Text
If an edit fails because the text doesn't match:
- **Try again** with the exact text from the document
- If still unclear, ask the user naturally: "Could you highlight the part you'd like me to change?"
- **NEVER** tell the user about match failures, percentages, or technical errors

### Answering Questions
Just answer naturally. Be concise, warm, and helpful.

### Creating Documents
Create new files when asked. Use rich Markdown formatting:
- Headings (#, ##, ###), bold, italic, lists, code blocks
- The document should look professional in the editor

---

## FORMATTING RULES

When generating or editing documents, **always use rich Markdown**:
- **Headings**: \`#\` for title, \`##\` for sections, \`###\` for subsections
- **Emphasis**: \`**bold**\` for key points, \`_italic_\` for nuance
- **Lists**: \`-\` for bullets, \`1.\` for numbered lists
- **Code**: Fenced code blocks with language tags

---

## RULES

### NEVER
- Mention tool names or internal processes
- Guess at text — read the document first  
- Edit without understanding what the user wants
- Say "I don't have access" — you have full workspace access

### ALWAYS
- Find the EXACT text before editing (copy from the document above)
- If the document is truncated, read it first
- Provide a brief reason when making edits
- Ask for clarification when the request is ambiguous
- Be concise — action over explanation

### CHOOSING HOW TO EDIT
- **For the open file (${hasOpenFile ? currentFile?.name : 'none'})**: ALWAYS use suggest_edit. NEVER use fs_update_file unless the user explicitly asks to "overwrite" or "replace" the entire file.
- **For other files**: You can use fs_update_file or suggest_edit as appropriate.
- **Multiple Instances**: If the text appears multiple times, you MUST call suggest_edit once for EACH instance.
- **Default to tracked changes** (suggest_edit) for all user-facing content.

---

You are the user's writing partner. Think deeply. Act precisely. Write beautifully. And never let the machinery show.`;
}

export async function POST(req: Request) {
    const { messages, model, toolResults, folderTree, currentFile, memoryContext, workspaceId, contextFiles } = await req.json();
    const selectedModel = model || "anthropic/claude-haiku-4.5";

    // Build system prompt with optional memory context appended
    let systemPrompt = buildSystemPrompt(folderTree || "", currentFile, undefined);

    // Add context files if provided
    if (contextFiles && contextFiles.length > 0) {
        systemPrompt += `\n\n### 📄 Additional Context Files\nThe user has explicitly added these files as context for their request:\n`;
        for (const file of contextFiles) {
            systemPrompt += `\n**File:** \`${file.name}\` (${file.path})\n\`\`\`\n${file.content || 'No content available'}\n\`\`\`\n`;
        }
    }

    if (memoryContext) {
        systemPrompt += memoryContext;
    }

    const llm = new ChatOpenAI({
        modelName: selectedModel,
        maxTokens: 4096,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
    });

    const lcMessages: any[] = [new SystemMessage(systemPrompt)];

    for (const msg of messages) {
        if (msg.role === "user") {
            lcMessages.push(new HumanMessage(msg.content));
        } else if (msg.role === "assistant") {
            lcMessages.push(new AIMessage(msg.content || ""));
        } else if (msg.role === "tool") {
            lcMessages.push(new ToolMessage({
                content: msg.content,
                tool_call_id: msg.tool_call_id,
            }));
        }
    }

    // Handle tool results from previous iteration (Client Side Tools)
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
        const llmWithTools = llm.bindTools(toolDefinitions);

        // First, check if the LLM wants to call tools (tools need atomic dispatch)
        const response = await llmWithTools.invoke(lcMessages);

        if (response.tool_calls && response.tool_calls.length > 0) {
            return Response.json({
                type: "tool_calls",
                toolCalls: response.tool_calls.map(tc => ({
                    id: tc.id,
                    name: tc.name,
                    args: tc.args
                })),
                content: typeof response.content === "string" ? response.content : ""
            });
        }

        // No tool calls — stream the final message via SSE
        const streamResponse = await llmWithTools.stream(lcMessages);
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
    } catch (error: any) {
        console.error("Chat API error:", error);
        return Response.json({
            type: "error",
            content: `Error: ${error.message}`
        }, { status: 500 });
    }
}
