import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const maxDuration = 15;

const GHOST_TEXT_SYSTEM_PROMPT = `You are a writing assistant that provides inline text completions.

Your task is to predict what the user might write next based on the context.

Rules:
1. Continue naturally from where the text ends
2. Keep suggestions SHORT (1-2 sentences max)
3. Match the writing style, tone, and voice
4. Don't repeat what's already written
5. Return ONLY the completion text, nothing else
6. If no good suggestion, return empty string

Examples of good completions:
- If text ends with "The main benefits of" → "this approach include improved efficiency and reduced costs."
- If text ends with "We recommend" → "implementing this solution in three phases."
- If text ends mid-sentence → complete that sentence naturally`;

export async function POST(req: Request) {
    try {
        const { text, cursorPosition, model, context } = await req.json();

        // Get text up to cursor position
        const textBeforeCursor = text.slice(0, cursorPosition);

        // Don't suggest if text is too short or ends with certain patterns
        if (textBeforeCursor.length < 10) {
            return Response.json({ suggestion: "" });
        }

        // Check if we're at a natural completion point
        const lastChar = textBeforeCursor.trim().slice(-1);
        const endsWithPunctuation = [".", "!", "?", ":", ";"].includes(lastChar);
        const endsWithSpace = textBeforeCursor.endsWith(" ");

        // Get the last ~500 chars for context
        const contextWindow = textBeforeCursor.slice(-500);

        const llm = new ChatOpenAI({
            modelName: model || "anthropic/claude-haiku-4.5",
            maxTokens: 100,
            temperature: 0.7,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: process.env.OPENROUTER_API_KEY,
            },
        });

        let prompt = `Continue the following text naturally. Return ONLY the completion text.

${context?.fileName ? `Document: ${context.fileName}\n` : ""}
Text to continue:
"""
${contextWindow}
"""

${endsWithPunctuation ? "Start a new thought or sentence." : endsWithSpace ? "Continue with the next word or phrase." : "Complete this word or phrase."}`;

        const response = await llm.invoke([
            new SystemMessage(GHOST_TEXT_SYSTEM_PROMPT),
            new HumanMessage(prompt)
        ]);

        const suggestion = typeof response.content === "string"
            ? response.content.trim()
            : "";

        // Clean up the suggestion
        let cleanSuggestion = suggestion
            .replace(/^["']|["']$/g, "") // Remove quotes
            .replace(/^\n+/, "") // Remove leading newlines
            .trim();

        // Don't return if it's too long or looks like an AI response
        if (cleanSuggestion.length > 200 ||
            cleanSuggestion.toLowerCase().includes("here's") ||
            cleanSuggestion.toLowerCase().includes("i'll")) {
            cleanSuggestion = "";
        }

        return Response.json({ suggestion: cleanSuggestion });

    } catch (error: any) {
        console.error("Ghost text error:", error);
        return Response.json({ suggestion: "" });
    }
}
