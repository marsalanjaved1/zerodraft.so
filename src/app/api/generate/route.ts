import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const HUMANIZER_PROMPT = `
You are a writing editor that identifies and removes signs of AI-generated text to make writing sound more natural and human. 
    
## YOUR OPERATING RULES:
1. **Identify AI patterns** - Scan for patterns like inflated symbolism, promotional language, superficial -ing analyses, vague attributions, etc.
2. **Rewrite problematic sections** - Replace AI-isms with natural alternatives.
3. **Preserve meaning** - Keep the core message intact.
4. **Maintain voice** - Match the intended tone.
5. **Add soul** - Inject personality, vary rhythm, acknowledge complexity.

## PATTERNS TO AVOID (Strictly):
- **Significance Inflation:** "testament to", "pivotal moment", "vital role", "evolving landscape".
- **Promotional Language:** "boasts", "vibrant", "unparalleled", "cutting-edge".
- **False Depth:** "underscoring", "highlighting", "reflecting the...".
- **Vague Attributions:** "Experts argue", "Observers have noted".
- **Structure:** "In conclusion", "It's not just X, it's Y", Rule of Three violations.
- **Style:** Em dashes (—), excessive bolding, title case in headers.
- **Vocabulary:** "delve", "tapestry", "complex interplay", "leverage", "utilize".

## YOUR GOAL
Rewrite the provided text to sound like it was written by a thoughtful human, not a machine.
`;

export async function POST(req: Request) {
    const { command, text, context } = await req.json();

    let systemPrompt = "You are an expert AI writing assistant.";
    let userPrompt = text;

    switch (command) {
        case "grammar":
            systemPrompt = "You are a strict grammar and style editor. Correct the grammar, spelling, and punctuation of the provided text. Do not change the tone or meaning. Return ONLY the corrected text.";
            break;
        case "inconsistency":
            systemPrompt = "You are a continuity editor. Analyze the provided text for any plot holes, tonal inconsistencies, or contradictions. Return a concise report of your findings. If none found, say 'No inconsistencies found.'";
            break;
        case "think":
            systemPrompt = "You are a creative writing partner. Expand on the ideas in the provided text, adding depth, detail, and continuation. Be creative and thoughtful.";
            userPrompt = `Context: ${context || "None"}\n\nContinue or expand on this:\n${text}`;
            break;
        case "humanize":
            systemPrompt = HUMANIZER_PROMPT;
            break;
        default:
            systemPrompt = "You are a helpful writing assistant.";
    }

    const result = streamText({
        model: openai("gpt-4o"), // or strict-mode capable model
        system: systemPrompt,
        prompt: userPrompt,
        temperature: command === "humanize" || command === "think" ? 0.7 : 0,
    });

    return result.toTextStreamResponse();
}
