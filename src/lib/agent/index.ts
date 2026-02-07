import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { allTools } from "./tools";

// Initialize the LLM with OpenRouter
export function createLLM(model: string = "anthropic/claude-haiku-4.5") {
    const llm = new ChatOpenAI({
        modelName: model,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        },
        streaming: true,
    });

    // Bind tools to the LLM
    return llm.bindTools(allTools);
}

const SYSTEM_PROMPT = `You are a helpful AI assistant integrated into a text editor.
You have access to file system tools and editor tools.

When asked to:
- Read files: Use fs_read_file
- Write/create files: Use fs_write_file
- Update/modify files: Use fs_update_file (find and replace text)
- List files: Use fs_list_directory
- Insert text: Use editor_insert_at_cursor
- Work with selection: Use editor_get_selection

Always use the appropriate tool when the user's request involves files or editor actions.
Be concise in your responses.`;

// Execute a tool by name
async function executeTool(toolName: string, toolInput: Record<string, any>): Promise<string> {
    const tool = allTools.find(t => t.name === toolName);
    if (!tool) {
        return `Error: Tool ${toolName} not found`;
    }
    try {
        // Use type assertion to handle the union type issue
        const result = await (tool as any).invoke(toolInput);
        return typeof result === "string" ? result : JSON.stringify(result);
    } catch (err: any) {
        return `Error executing ${toolName}: ${err.message}`;
    }
}

// Run the agent loop with tool execution
export async function* runAgent(
    model: string,
    userInput: string,
    chatHistory: Array<{ role: string; content: string }> = [],
    editorContext?: { selection?: string; cursorPosition?: number }
) {
    const llm = createLLM(model);

    // Build messages
    const messages: any[] = [
        new SystemMessage(SYSTEM_PROMPT),
        ...chatHistory.map(msg =>
            msg.role === "user"
                ? new HumanMessage(msg.content)
                : new AIMessage(msg.content || "")
        ),
        new HumanMessage(userInput),
    ];

    // Agent loop - run until no more tool calls
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
        iterations++;

        // Call the LLM
        const response = await llm.invoke(messages);

        // Check for tool calls
        const toolCalls = response.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
            // No tool calls - yield final response and exit
            if (response.content) {
                yield {
                    type: "output",
                    content: typeof response.content === "string"
                        ? response.content
                        : JSON.stringify(response.content),
                };
            }
            break;
        }

        // Add AI message to history
        messages.push(response);

        // Execute each tool call
        for (const toolCall of toolCalls) {
            // Yield tool call info
            yield {
                type: "tool_call",
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                toolInput: toolCall.args,
            };

            // Execute the tool
            const result = await executeTool(toolCall.name, toolCall.args);

            // Yield tool result
            yield {
                type: "tool_result",
                toolCallId: toolCall.id,
                result,
            };

            // Add tool result to messages
            messages.push(new ToolMessage({
                content: result,
                tool_call_id: toolCall.id!,
            }));
        }
    }
}

export { allTools };
