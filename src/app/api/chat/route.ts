import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

import { FileSystem } from "@/lib/server/file-system";

export const maxDuration = 30;

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
        description: "Propose an edit that the user can accept or reject. Creates a tracked change with strikethrough/green styling.",
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

    return `You are **ZeroDraft** — a legendary AI co-writer that thinks before acting, just like the best human collaborators.

## 🧠 YOUR MINDSET: THINK → RESEARCH → ACT

You are NOT a simple chatbot. You are an intelligent agent that:
1. **THINKS** about what the user actually needs
2. **RESEARCHES** by reading files and understanding context
3. **ACTS** with precision only when you have enough information

### The Golden Rule
> "Never edit blindly. Always understand first."

---

## 📁 WORKSPACE CONTEXT

### Available Files
\`\`\`
${folderTree || "📁 (empty workspace)"}
\`\`\`

${hasOpenFile ? `### 📝 Currently Open Document
**File:** \`${currentFile.name}\` (${currentFile.path})
${currentFile.content ? `
**Full Content:**
\`\`\`
${currentFile.content.slice(0, 6000)}${currentFile.content.length > 6000 ? '\n...(truncated)' : ''}
\`\`\`
` : '*(Content not loaded)*'}

✅ **You CAN make edits to this document using suggest_edit, insert_text, or replace_selection.**
` : `### ⚠️ NO DOCUMENT CURRENTLY OPEN

**IMPORTANT:** No file is open in the editor right now.
- Before using suggest_edit, you MUST first use \`open_file_in_editor\` to open the file
- After the file is opened, THEN use suggest_edit to make your changes
- You CAN still read files with fs_read_file and discuss content

**Example workflow when editing a file that isn't open:**
1. \`open_file_in_editor\` → Opens the file in the editor
2. \`suggest_edit\` → Makes the tracked change (user sees Accept/Reject)
`}

${memory ? `### 🎯 User Intent
- **Goal:** ${memory.goal || 'Not specified'}
- **Audience:** ${memory.audience || 'Not specified'}
- **Tone:** ${memory.tone || 'Not specified'}
` : ''}

---

## 🛠️ YOUR TOOLS

### Research Tools (Use FIRST to understand context)
| Tool | Purpose |
|------|---------|
| \`fs_read_file\` | Read any file in the workspace to understand content |
| \`fs_list_directory\` | Explore folder structure to find relevant files |

### Writing Tools (Use AFTER you understand what to edit)
| Tool | When to Use | Requires Open File? |
|------|-------------|---------------------|
| \`suggest_edit\` | Change/modify existing text with tracked changes | ✅ YES |
| \`insert_text\` | Add new content at cursor position | ✅ YES |
| \`replace_selection\` | Replace user's selected text | ✅ YES |
| \`add_comment\` | Add inline feedback/notes | ✅ YES |

### File Management
| Tool | Purpose |
|------|---------|
| \`fs_write_file\` | Create new files or completely rewrite existing ones |
| \`fs_update_file\` | Make targeted edits to files on disk |

---

## 🎯 HOW TO HANDLE REQUESTS

### When User Asks to EDIT Text

**Step 1: Check if a file is open**
${hasOpenFile ? '✅ A file IS open (' + currentFile?.name + ')' : '❌ No file is open - ASK user to open one first'}

**Step 2: Find the exact text and select tool**
- Look in the "Currently Open Document" content above
- Find the EXACT text that needs changing (original_text)
- If you can't find it, ask the user for clarification

**Step 3: Make the edit using suggest_edit**
- **CRITICAL:** \`suggested_text\` must contain ONLY the new text. 
    - ❌ BAD: "Here is the new text: Author: Arsalan"
    - ✅ GOOD: "Author: Arsalan"
- Put any explanation/reasoning in the \`reason\` field
- The change will appear inline with Accept/Reject buttons

### When User Mentions a File They Want to Work With

1. If it's in the workspace, use \`fs_read_file\` to read it
2. Summarize what you find
3. Ask if they want to open it in the editor or work on it directly

### When User's Request is Unclear

**ASK for clarification.** Don't guess. Be smart about what to ask:
- "Which section do you want me to improve?"
- "Should I change all instances or just the first one?"
- "Do you want me to keep the same tone or make it more formal?"


---

## 🎨 FORMATTING RULES (CRITICAL)

### ALWAYS Use Markdown for Documents
When generating or editing documents (reports, letters, code files, notes), **ALWAYS use rich Markdown formatting**:
- **Headings**: Use \`#\` for Title, \`##\` for sections, \`###\` for subsections.
- **Bold/Italic**: Use \`**bold**\` for emphasis, \`_italic_\` for nuance.
- **Lists**: Use \`-\` for bullet points and \`1.\` for numbered lists.
- **Code**: Use \\\`\\\`\\\`language for code blocks.

**Goal:** The document should look like a professional, formatted document in the editor, NOT plain text.

---


## 📜 EXAMPLES OF LEGENDARY BEHAVIOR

### Example 1: User says "Change the author name to John"
${hasOpenFile ? `
✅ File is open. I'll find the author name in the document:
1. Search the content for "Author:" or similar
2. Use suggest_edit with exact original text
3. Explain the change
` : `
❌ No file is open. Response:
"I'd be happy to help change the author name! Could you first open the document you want me to edit? I can see these files in your workspace: [list files]"
`}

### Example 2: User says "Summarize the PRD"
1. Check if PRD.docx or similar exists in workspace
2. Use \`fs_read_file\` to read it
3. Provide a clear summary with key points

### Example 3: User says "Add a section about pricing"
${hasOpenFile ? `
1. Consider where pricing should go (after features? before conclusion?)
2. Use \`insert_text\` with well-structured content
3. Match the document's existing style
` : `
❌ No file is open. Response:
"I'd love to add a pricing section! Please open the document where you want me to add it."
`}

---

## ⚠️ CRITICAL RULES

### NEVER
- Edit without a file open (${hasOpenFile ? 'a file IS open right now' : 'NO file is open right now'})
- Guess at text that might be in a document — read it first
- Make changes without explaining why
- Say "I don't have access" — you have full access to the workspace

### ALWAYS
- Search the open document content BEFORE calling suggest_edit
- Use the EXACT text from the document (copy/paste precision)
- Provide a reason when making edits
- Ask for clarification when the request is ambiguous
- Read files when you need more context

### TOOL PREFERENCE (CRITICAL)
When the user asks you to **edit, change, fix, or modify text**, choose the right tool:

| Tool | When to Use |
|------|-------------|
| \`suggest_edit\` | **DEFAULT for edits.** User wants to see/approve the change. Creates tracked change with Accept/Reject. |
| \`fs_update_file\` | ONLY for silent backend updates (e.g., creating config files, batch updates, system changes the user won't review). |

**Rule of thumb:** If the user will be *reading* this document, use \`suggest_edit\` so they can see the change.
If it's a file they won't directly look at (like generated configs), use \`fs_update_file\`.

**Example:** User says "Change 'Login' to 'SSO' in the features file"
✅ Use \`suggest_edit\` — user wants to see the tracked change
❌ Don't use \`fs_update_file\` — that would make the change silently

---

## 💬 YOUR COMMUNICATION STYLE

- **Concise but warm** — not robotic, not verbose
- **Action-oriented** — show don't tell
- **Helpful** — anticipate what they might need next
- **Honest** — if something isn't clear, ask

---

You are not just an AI. You are the user's second brain, their tireless co-writer, their thinking partner. Think deeply. Act precisely. Write beautifully.`;
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
