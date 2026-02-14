/**
 * Planner Module — Intent Classification & Execution Planning
 * 
 * Before entering the Controller tool loop, this module:
 * 1. Classifies the user's intent into a known category
 * 2. Generates a brief execution plan (2-4 steps)
 * 3. Returns both to be injected into the Controller's system prompt
 * 
 * This transforms the Controller from a reactive "respond to whatever" loop
 * into a strategic, plan-first executor.
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// --- Types ---

export type Intent =
    | "write_new"           // Draft new content from scratch
    | "edit_existing"       // Modify/improve existing text
    | "research"            // Look up information, read files, gather context
    | "organize_workspace"  // Create/move/delete files, restructure
    | "brainstorm"          // Ideate, outline, explore ideas
    | "general_chat";       // Casual conversation, questions, help

export interface ExecutionPlan {
    intent: Intent;
    summary: string;       // One-line description of what the user wants
    steps: string[];       // 2-4 concrete steps the Controller should follow
    requiresWriter: boolean; // Whether the plan involves creative writing
}

// --- Prompt ---

const PLANNER_SYSTEM_PROMPT = `You are a planning agent for a writing assistant. Your job is to analyze the user's message and produce an execution plan.

## OUTPUT FORMAT (JSON only, no markdown):
{
  "intent": "<one of: write_new, edit_existing, research, organize_workspace, brainstorm, general_chat>",
  "summary": "<one-line description of what the user wants>",
  "steps": ["step 1", "step 2", "step 3"],
  "requiresWriter": <true if creative writing is needed, false otherwise>
}

## INTENT DEFINITIONS:
- **write_new**: User wants NEW content created (draft, essay, section, document)
- **edit_existing**: User wants to CHANGE existing text (rewrite, improve, fix, shorten)
- **research**: User wants to read files, gather info, understand something in the workspace
- **organize_workspace**: User wants to create/rename/delete/move files or folders
- **brainstorm**: User wants to explore ideas, create outlines, or get suggestions
- **general_chat**: User is asking a question, making small talk, or needs help

## STEP GUIDELINES:
- Keep steps concrete and actionable (e.g., "Read the PRD file" not "Understand the context")
- 2-4 steps max
- Reference specific tools when relevant (fs_read_file, consult_writer, suggest_edit, etc.)
- For edit_existing: always include reading the file first if needed

## CONTEXT:
{context}

Return ONLY valid JSON. No explanation.`;

// --- Core Function ---

/**
 * Classify user intent and generate an execution plan.
 * Uses a fast, cheap model for low latency.
 */
export async function generatePlan(
    userMessage: string,
    context: {
        hasOpenFile: boolean;
        openFileName?: string;
        hasSelection?: boolean;
        fileCount?: number;
    },
    threadId?: string
): Promise<ExecutionPlan> {
    try {
        const llm = new ChatOpenAI({
            modelName: "anthropic/claude-haiku-4.5",
            temperature: 0,
            maxTokens: 512,
            tags: ["planner", "zerodraft"],
            metadata: threadId ? { session_id: threadId } : undefined,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: process.env.OPENROUTER_API_KEY,
            },
        });

        const contextStr = [
            context.hasOpenFile ? `Currently open file: "${context.openFileName}"` : "No file is open",
            context.hasSelection ? "User has text selected in the editor" : "No text selected",
            context.fileCount !== undefined ? `Workspace has ${context.fileCount} files` : "",
        ].filter(Boolean).join("\n");

        const prompt = PLANNER_SYSTEM_PROMPT.replace("{context}", contextStr);

        const response = await llm.invoke([
            new SystemMessage(prompt),
            new HumanMessage(userMessage),
        ]);

        const content = typeof response.content === "string" ? response.content : "";

        // Parse JSON response
        const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const plan = JSON.parse(cleaned) as ExecutionPlan;

        // Validate
        const validIntents: Intent[] = ["write_new", "edit_existing", "research", "organize_workspace", "brainstorm", "general_chat"];
        if (!validIntents.includes(plan.intent)) {
            plan.intent = "general_chat";
        }
        if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
            plan.steps = ["Respond to the user's request"];
        }

        return plan;
    } catch (err) {
        console.warn("[Planner] Failed to generate plan, falling back:", err);
        return {
            intent: "general_chat",
            summary: "Respond to the user",
            steps: ["Respond to the user's request"],
            requiresWriter: false,
        };
    }
}

/**
 * Format a plan into a prompt section for injecting into the Controller's system prompt.
 */
export function formatPlanForPrompt(plan: ExecutionPlan): string {
    const stepsStr = plan.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

    return `
### 🎯 Execution Plan
**Intent:** ${plan.intent}
**Goal:** ${plan.summary}
**Steps:**
${stepsStr}
${plan.requiresWriter ? "\n⚡ **This task requires the Writer.** Use `consult_writer` for any prose drafting." : ""}

Follow this plan in order. Do NOT skip steps. If a step fails, adapt and continue.`;
}
