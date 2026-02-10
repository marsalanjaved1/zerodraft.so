import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Editor tools work with the frontend:
 * - They return structured actions that the frontend interprets
 * - The frontend passes editor context (selection, cursor position) via the chat request
 */

export const editorInsertAtCursor = new DynamicStructuredTool({
    name: "editor_insert_at_cursor",
    description: "Insert text at the user's current cursor position in the editor. Use this when the user asks to add or insert content into their document.",
    schema: z.object({
        text: z.string().describe("The text to insert at the cursor position"),
    }),
    func: async ({ text }) => {
        // Return a structured action for the frontend to execute
        return JSON.stringify({
            action: "insert_at_cursor",
            payload: { text },
            success: true,
        });
    },
});

export const editorGetSelection = new DynamicStructuredTool({
    name: "editor_get_selection",
    description: "Get the currently selected text from the editor. Use this when you need to know what the user has highlighted.",
    schema: z.object({
        // This tool doesn't need input - selection comes from frontend context
        reason: z.string().optional().describe("Why you need the selection (for logging)"),
    }),
    func: async () => {
        // The selection is passed via editorContext in the API request
        // This tool signals intent - the frontend will provide the selection
        return JSON.stringify({
            action: "get_selection",
            message: "Selection will be provided by the frontend context",
        });
    },
});

export const editorReplaceSelection = new DynamicStructuredTool({
    name: "editor_replace_selection",
    description: "Replace the currently selected text with new content. Use this when the user asks to rewrite or modify their selection.",
    schema: z.object({
        new_text: z.string().describe("The text to replace the selection with"),
    }),
    func: async ({ new_text }) => {
        return JSON.stringify({
            action: "replace_selection",
            payload: { text: new_text },
            success: true,
        });
    },
});

export const editorTools = [editorInsertAtCursor, editorGetSelection, editorReplaceSelection];
