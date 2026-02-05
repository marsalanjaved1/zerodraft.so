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
        description: "Read the content of a file from the workspace",
        schema: z.object({
            path: z.string().describe("Path to the file (e.g., 'Specs/PRD.md')")
        })
    }
);

const fsWriteFile = tool(
    async () => "placeholder",
    {
        name: "fs_write_file",
        description: "Create or overwrite a file in the workspace",
        schema: z.object({
            path: z.string().describe("Path to the file"),
            content: z.string().describe("Content to write")
        })
    }
);

const fsUpdateFile = tool(
    async () => "placeholder",
    {
        name: "fs_update_file",
        description: "Update a file by replacing specific text",
        schema: z.object({
            path: z.string().describe("Path to the file"),
            search_text: z.string().describe("Text to find"),
            replacement_text: z.string().describe("Text to replace with")
        })
    }
);

const fsListDirectory = tool(
    async () => "placeholder",
    {
        name: "fs_list_directory",
        description: "List all files in a directory",
        schema: z.object({
            path: z.string().optional().describe("Directory path (defaults to root)")
        })
    }
);

const toolDefinitions = [fsReadFile, fsWriteFile, fsUpdateFile, fsListDirectory];


const SYSTEM_PROMPT = `You are a PM Copilot - an AI assistant for product managers in a document workspace.

## AVAILABLE TOOLS
- fs_read_file: Read file content (path: string)
- fs_write_file: Create/overwrite files (path: string, content: string)  
- fs_update_file: Find and replace text (path: string, search_text: string, replacement_text: string)
- fs_list_directory: List files in workspace (path?: string)

## CORE PRINCIPLES

### 1. EXECUTE IMMEDIATELY
When a user asks about files, CALL the tool immediately. Never say "I'll use the tool" without calling it.

### 2. TRUST TOOL RESULTS
After a tool executes successfully, TRUST the result and proceed. DO NOT:
- Re-call fs_list_directory to "verify" a file exists after you already read it
- Loop back to check paths you've already confirmed
- Second-guess successful tool responses

### 3. MULTI-STEP WORKFLOWS
For tasks like "Read X and generate Y from it":
1. Call fs_read_file ONCE
2. Process the content in your response (synthesize, transform, extract)
3. If writing output, call fs_write_file ONCE
4. Respond with a summary

NEVER loop back to step 1 after completing it. Move forward decisively.

### 4. BE DECISIVE
After receiving tool results:
- Analyze the content immediately
- Produce your deliverable (user stories, summary, comparison, etc.)
- Present it to the user

### 5. HANDLE ERRORS GRACEFULLY
If a file doesn't exist, inform the user and list available files. Don't retry the same path.

## EXAMPLE WORKFLOWS

**"Generate user stories from PRD.md":**
1. fs_read_file("PRD.md")
2. [Receive content] → Immediately write 3-5 user stories based on it
3. Optionally save to a new file
4. Present the stories to the user

**"Compare A.md and B.md":**
1. fs_read_file("A.md") AND fs_read_file("B.md") 
2. [Receive both contents] → Immediately analyze differences
3. Present comparison to user

## CRITICAL: NO TOOL CHAINING AFTER RESULTS

After receiving ANY tool result, you MUST respond to the user directly. DO NOT make another tool call.

**FORBIDDEN PATTERN (NEVER DO THIS):**
- User: "Read X.md and generate stories"
- You call: fs_read_file("X.md")
- Result: "File not found: X.md"
- ❌ WRONG: "Let me check what files are available" → fs_list_directory()
- ✅ CORRECT: "I couldn't find X.md. Would you like me to list the available files?"

**FORBIDDEN PATTERN (NEVER DO THIS):**
- User: "Read X.md and generate stories"
- You call: fs_read_file("X.md")
- Result: [file content returned]
- ❌ WRONG: "Let me verify the file exists" → fs_list_directory()
- ✅ CORRECT: Immediately generate the stories from the content you just received

After a tool executes, your ONLY option is to respond with text. No more tools.

NO LOOPS. NO RE-VERIFICATION. NO CHAINING. TRUST AND RESPOND.

Be concise in final responses. Use markdown formatting.`;

export async function POST(req: Request) {
    const { messages, model, toolResults } = await req.json();
    const selectedModel = model || "anthropic/claude-3.5-sonnet";

    // Initialize LLM with OpenRouter
    const llm = new ChatOpenAI({
        modelName: selectedModel,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
    });

    // Build LangChain messages
    const lcMessages: any[] = [new SystemMessage(SYSTEM_PROMPT)];

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
        // We reconstruct this from the client's execution data to ensure history validity
        lcMessages.push(new AIMessage({
            content: "",
            tool_calls: toolResults.map((r: any) => ({
                id: r.toolCallId,
                name: r.toolName || "tool", // Use actual tool name from client
                args: r.args || {}          // Use actual args from client
            }))
        }));

        // Add tool results
        for (const result of toolResults) {
            lcMessages.push(new ToolMessage({
                content: result.result,
                tool_call_id: result.toolCallId,
                name: result.toolName // Optional but good practice
            }));
        }

        // Get final response without tools (we already executed them)
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
            // Return tool calls for client to execute
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
