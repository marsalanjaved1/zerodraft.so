import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

export const maxDuration = 30;

// Tool definitions using LangChain's tool helper
const fsReadFile = tool(
    async () => "placeholder", // We don't execute here
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
        description: "Create a new file or completely overwrite an existing file. Use for creating documents, saving generated content, or replacing files entirely.",
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
        description: "List all files and folders in a directory. Useful when you need to explore the workspace structure or find files.",
        schema: z.object({
            path: z.string().optional().describe("Directory path (defaults to root)")
        })
    }
);

const toolDefinitions = [fsReadFile, fsWriteFile, fsUpdateFile, fsListDirectory];

// Helper to build folder tree string from file nodes
function buildFolderTree(files: any[], prefix: string = ""): string {
    let tree = "";
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isLast = i === files.length - 1;
        const connector = isLast ? "└── " : "├── ";
        const icon = file.type === "folder" ? "📁" : "📄";

        tree += `${prefix}${connector}${icon} ${file.name}\n`;

        if (file.type === "folder" && file.children && file.children.length > 0) {
            const childPrefix = prefix + (isLast ? "    " : "│   ");
            tree += buildFolderTree(file.children, childPrefix);
        }
    }
    return tree;
}

// Build dynamic system prompt with workspace context
function buildSystemPrompt(folderTree: string, currentFile: any | null): string {
    return `You are **zerodraft Copilot** — an elite AI assistant for product managers built into a document workspace.

## YOUR WORKSPACE

You have FULL AWARENESS of every file in the user's workspace. Here is the complete folder structure:

\`\`\`
${folderTree || "📁 (empty workspace)"}
\`\`\`

${currentFile ? `**Currently Open Document:** \`${currentFile.name}\` (path: ${currentFile.path})
${currentFile.content ? `
**Document Content:**
\`\`\`
${currentFile.content.slice(0, 3000)}${currentFile.content.length > 3000 ? '\n...(truncated)' : ''}
\`\`\`
` : ''}` : 'No document is currently open.'}

## TOOLS AT YOUR DISPOSAL

| Tool | Purpose |
|------|---------|
| \`fs_read_file\` | Read any file's content |
| \`fs_write_file\` | Create or overwrite files |
| \`fs_update_file\` | Find & replace in files |
| \`fs_list_directory\` | Explore folder contents |

## INTELLIGENCE GUIDELINES

### 1. LEVERAGE YOUR CONTEXT
You ALREADY KNOW every file in the workspace (shown above). When the user mentions a file:
- **Direct match**: If they say "read PRD.md" and you see \`📄 PRD.md\` above → call \`fs_read_file\` immediately
- **Fuzzy match**: If they say "what's in the doc" → look at the folder tree and infer the most likely file
- **Current file**: If they ask about "this document" → use the currently open document context above

### 2. BE PROACTIVE & SMART
- When asked about a file you can see in the tree, READ IT immediately—don't ask for clarification
- If multiple files could match, read the most likely one first, or ask to clarify
- For the currently open document, you already have the content—use it directly without calling tools

### 3. EXECUTE DECISIVELY
- Call tools immediately when needed. Never say "I'll read the file" without actually calling the tool
- After receiving tool results, respond with insights—don't call more tools unless necessary
- If a file doesn't exist, say so and suggest alternatives from the tree

### 4. BE A PM EXPERT
You understand:
- PRDs, specs, user stories, roadmaps, OKRs, competitive analysis
- How to extract actionable insights from documents
- How to synthesize information across multiple files
- How to write in clear, professional PM language

### 5. RESPONSE STYLE
- **Concise**: Get to the point. No unnecessary preamble
- **Structured**: Use headers, bullets, tables when helpful
- **Actionable**: Provide specific recommendations, not vague suggestions
- **Markdown**: Format responses beautifully

## EXAMPLE INTERACTIONS

**User:** "What's in the PRD?"
*You see \`📄 PRD.md\` in the folder tree above → Immediately call \`fs_read_file("PRD.md")\`*

**User:** "Summarize this document"
*currentFile.content is available above → Summarize it directly without calling any tool*

**User:** "Generate user stories from the requirements"
*currentFile.content has the requirements → Generate stories directly, or call fs_read_file if you need a different file*

**User:** "What files do I have?"
*You see the folder tree above → List them directly from your context, no tool needed*

**User:** "Create a new spec from this PRD"
*Read the PRD content (or use currentFile), then call \`fs_write_file\` to create the spec*

## CRITICAL RULES

1. **NEVER ask "which file?" when you can infer it** from context or folder tree
2. **NEVER re-list files** when you already have the folder tree
3. **NEVER say "I don't have access"** — you have full access via tools
4. **ALWAYS trust tool results** and respond with substance
5. **USE the currentFile content** when the user refers to "this document"

You are an extension of the user's brain. Think ahead. Be decisive. Deliver value.`;
}

export async function POST(req: Request) {
    const { messages, model, toolResults, folderTree, currentFile } = await req.json();
    const selectedModel = model || "anthropic/claude-3.5-sonnet";

    // Build dynamic system prompt with workspace context
    const systemPrompt = buildSystemPrompt(folderTree || "", currentFile);

    // Initialize LLM with OpenRouter
    const llm = new ChatOpenAI({
        modelName: selectedModel,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
    });

    // Build LangChain messages
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

    // If we have tool results, add them and get final response
    if (toolResults && toolResults.length > 0) {
        // Add an AI message with tool calls (required by the LLM format)
        lcMessages.push(new AIMessage({
            content: "",
            tool_calls: toolResults.map((r: any) => ({
                id: r.toolCallId,
                name: r.toolName || "tool",
                args: r.args || {}
            }))
        }));

        // Add tool results
        for (const result of toolResults) {
            lcMessages.push(new ToolMessage({
                content: result.result,
                tool_call_id: result.toolCallId,
                name: result.toolName
            }));
        }

        // Get final response without tools
        try {
            const response = await llm.invoke(lcMessages);
            return Response.json({
                type: "message",
                content: typeof response.content === "string"
                    ? response.content
                    : JSON.stringify(response.content)
            });
        } catch (error: any) {
            console.error("Chat API error (tool results):", error);
            return Response.json({
                type: "error",
                content: `Error: ${error.message}`
            }, { status: 500 });
        }
    }

    try {
        // Call LLM with tools
        const llmWithTools = llm.bindTools(toolDefinitions);
        const response = await llmWithTools.invoke(lcMessages);

        // Check if LLM wants to call tools
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

        // No tools - return final response
        return Response.json({
            type: "message",
            content: typeof response.content === "string"
                ? response.content
                : JSON.stringify(response.content)
        });
    } catch (error: any) {
        console.error("Chat API error:", error);
        return Response.json({
            type: "error",
            content: `Error: ${error.message}`
        }, { status: 500 });
    }
}
