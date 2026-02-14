/**
 * Reflection Module — Long-Term Memory for Zero Draft
 * 
 * After each conversation turn, this module:
 * 1. Extracts user preferences, style patterns, and facts from the conversation
 * 2. Merges them with existing memories (deduplication)
 * 3. Stores them in Supabase for future sessions
 * 
 * Inspired by openCanva's reflection graph, but implemented as a simpler
 * async function that runs after the response is sent.
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createClient } from "@/lib/supabase/server";

// --- Types ---

export interface Memory {
    id?: string;
    user_id: string;
    workspace_id?: string;
    category: "style" | "preference" | "fact" | "instruction";
    content: string;
    source: "reflection" | "explicit";
    confidence: number;
}

interface ExtractedMemory {
    category: "style" | "preference" | "fact" | "instruction";
    content: string;
    confidence: number;
}

// --- Prompts ---

const REFLECTION_SYSTEM_PROMPT = `You are a memory extraction agent. Your job is to analyze a conversation between a user and a writing assistant and extract LASTING insights about the user.

## WHAT TO EXTRACT:
1. **Style preferences** (category: "style") — e.g., "User prefers short, punchy sentences", "User writes in a dark, sardonic tone"
2. **Explicit preferences** (category: "preference") — e.g., "User wants all docs in Markdown format", "User hates bullet points"
3. **Facts** (category: "fact") — e.g., "User is writing a thriller novel", "User works in fintech"
4. **Instructions** (category: "instruction") — e.g., "Always use Oxford comma", "Never start paragraphs with 'However'"

## RULES:
- Only extract things that would be useful in FUTURE conversations
- Do NOT extract one-off task details ("user asked to fix a typo")
- Be SPECIFIC, not vague ("prefers active voice" > "has writing preferences")
- Assign a confidence score (0.0-1.0) based on how clearly this was expressed
- Return a JSON array of objects: [{ "category": "...", "content": "...", "confidence": 0.X }]
- If nothing worth remembering, return an empty array: []

## EXISTING MEMORIES (avoid duplicates):
{existing_memories}

Return ONLY valid JSON. No explanation, no markdown fencing.`;

// --- Core Functions ---

/**
 * Extract reflections from a conversation and store them.
 * This is designed to be called in a non-blocking way after the response is sent.
 */
export async function extractAndStoreReflections(
    userId: string,
    workspaceId: string | undefined,
    conversationSnippet: string,
    existingMemories: Memory[],
    threadId?: string
): Promise<void> {
    try {
        // Use a cheap, fast model for reflection
        const llm = new ChatOpenAI({
            modelName: "anthropic/claude-haiku-4.5",
            temperature: 0,
            maxTokens: 1024,
            tags: ["reflection", "zerodraft"],
            metadata: threadId ? { session_id: threadId } : undefined,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: process.env.OPENROUTER_API_KEY,
            },
        });

        const existingMemoriesStr = existingMemories.length > 0
            ? existingMemories.map(m => `- [${m.category}] ${m.content}`).join("\n")
            : "None yet.";

        const prompt = REFLECTION_SYSTEM_PROMPT.replace("{existing_memories}", existingMemoriesStr);

        const response = await llm.invoke([
            new SystemMessage(prompt),
            new HumanMessage(`Here is the recent conversation:\n\n${conversationSnippet}`),
        ]);

        const content = typeof response.content === "string" ? response.content : "";

        // Parse the JSON response
        let extracted: ExtractedMemory[];
        try {
            // Strip markdown fencing if present
            const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            extracted = JSON.parse(cleaned);
        } catch {
            console.warn("[Reflection] Failed to parse LLM response:", content);
            return;
        }

        if (!Array.isArray(extracted) || extracted.length === 0) {
            return; // Nothing to store
        }

        // Deduplicate against existing memories
        const newMemories = deduplicateMemories(extracted, existingMemories);

        if (newMemories.length === 0) {
            return;
        }

        // Store in Supabase
        const supabase = await createClient();
        const rows = newMemories.map(m => ({
            user_id: userId,
            workspace_id: workspaceId || null,
            category: m.category,
            content: m.content,
            source: "reflection" as const,
            confidence: m.confidence,
        }));

        const { error } = await supabase.from("agent_memories").insert(rows);

        if (error) {
            console.error("[Reflection] Failed to store memories:", error);
        } else {
            console.log(`[Reflection] Stored ${newMemories.length} new memories for user ${userId}`);
        }
    } catch (err) {
        // Never let reflection errors crash the main flow
        console.error("[Reflection] Error in extractAndStoreReflections:", err);
    }
}

/**
 * Fetch all memories for a user, optionally filtered by workspace.
 */
export async function fetchMemories(
    userId: string,
    workspaceId?: string
): Promise<Memory[]> {
    const supabase = await createClient();

    let query = supabase
        .from("agent_memories")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50); // Cap to prevent prompt bloat

    // Fetch both global (null workspace) and workspace-specific memories
    if (workspaceId) {
        query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
    } else {
        query = query.is("workspace_id", null);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[Reflection] Failed to fetch memories:", error);
        return [];
    }

    return (data || []) as Memory[];
}

/**
 * Format memories into a string for injection into the system prompt.
 */
export function formatMemoriesForPrompt(memories: Memory[]): string {
    if (memories.length === 0) return "";

    const grouped: Record<string, string[]> = {
        style: [],
        preference: [],
        fact: [],
        instruction: [],
    };

    for (const m of memories) {
        grouped[m.category]?.push(m.content);
    }

    const sections: string[] = [];

    if (grouped.style.length > 0) {
        sections.push(`**Writing Style:**\n${grouped.style.map(s => `- ${s}`).join("\n")}`);
    }
    if (grouped.preference.length > 0) {
        sections.push(`**Preferences:**\n${grouped.preference.map(s => `- ${s}`).join("\n")}`);
    }
    if (grouped.fact.length > 0) {
        sections.push(`**Known Facts:**\n${grouped.fact.map(s => `- ${s}`).join("\n")}`);
    }
    if (grouped.instruction.length > 0) {
        sections.push(`**Standing Instructions:**\n${grouped.instruction.map(s => `- ${s}`).join("\n")}`);
    }

    return `\n### 🧠 User Memory (learned from past sessions)\n${sections.join("\n\n")}`;
}

// --- Internal Helpers ---

/**
 * Simple deduplication: skip any new memory whose content is >80% similar to existing ones.
 */
function deduplicateMemories(
    newMemories: ExtractedMemory[],
    existing: Memory[]
): ExtractedMemory[] {
    return newMemories.filter(newMem => {
        return !existing.some(existingMem => {
            if (existingMem.category !== newMem.category) return false;
            return stringSimilarity(existingMem.content, newMem.content) > 0.8;
        });
    });
}

/**
 * Basic Jaccard-ish word overlap similarity. Good enough for deduplication.
 */
function stringSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
}
