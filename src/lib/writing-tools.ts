/**
 * Writing-focused tools for the AI agent
 * These tools allow the AI to directly interact with the editor
 */

export interface WritingAction {
    type: "insert" | "replace" | "suggest" | "comment" | "highlight";
    content: string;
    position?: number;
    originalText?: string;
    metadata?: {
        reason?: string;
        confidence?: number;
    };
}

export interface WritingToolResult {
    success: boolean;
    message: string;
    action?: WritingAction;
}

/**
 * Tool definitions for writing operations
 */
export const WRITING_TOOL_DEFINITIONS = [
    {
        name: "insert_text",
        description: "Insert text at the current cursor position in the editor. Use this to add new content to the document.",
        schema: {
            type: "object",
            properties: {
                text: {
                    type: "string",
                    description: "The text to insert at the cursor position"
                },
            },
            required: ["text"]
        }
    },
    {
        name: "replace_selection",
        description: "Replace the currently selected text with new text. Use this when the user has selected text and wants it rewritten or improved.",
        schema: {
            type: "object",
            properties: {
                new_text: {
                    type: "string",
                    description: "The new text to replace the selection with"
                },
                reason: {
                    type: "string",
                    description: "Brief explanation of why this change was made"
                }
            },
            required: ["new_text"]
        }
    },
    {
        name: "suggest_edit",
        description: "Propose an edit that the user can accept or reject. Creates a tracked change showing the original and suggested text side by side.",
        schema: {
            type: "object",
            properties: {
                original_text: {
                    type: "string",
                    description: "The original text to be replaced (must match text in the document)"
                },
                suggested_text: {
                    type: "string",
                    description: "The suggested replacement text"
                },
                reason: {
                    type: "string",
                    description: "Explanation for why this edit is suggested"
                }
            },
            required: ["original_text", "suggested_text"]
        }
    },
    {
        name: "add_comment",
        description: "Add an inline comment to a specific part of the document. Use for feedback, suggestions, or notes.",
        schema: {
            type: "object",
            properties: {
                target_text: {
                    type: "string",
                    description: "The text in the document to attach the comment to"
                },
                comment: {
                    type: "string",
                    description: "The comment content"
                }
            },
            required: ["target_text", "comment"]
        }
    },
    {
        name: "get_selection",
        description: "Get the currently selected text in the editor. Use this when you need to see what the user has highlighted.",
        schema: {
            type: "object",
            properties: {},
        }
    },
    {
        name: "search_document",
        description: "Search for text within the current document.",
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The text or pattern to search for"
                }
            },
            required: ["query"]
        }
    }
];

/**
 * Execute a writing tool
 */
export function executeWritingTool(
    toolName: string,
    args: Record<string, any>,
    editorContext: {
        getSelection?: () => string | null;
        getContent?: () => string;
        insertText?: (text: string) => void;
    }
): WritingToolResult {
    switch (toolName) {
        case "insert_text": {
            return {
                success: true,
                message: `Ready to insert ${args.text.length} characters`,
                action: {
                    type: "insert",
                    content: args.text
                }
            };
        }

        case "replace_selection": {
            return {
                success: true,
                message: `Ready to replace selection with new text`,
                action: {
                    type: "replace",
                    content: args.new_text,
                    metadata: {
                        reason: args.reason
                    }
                }
            };
        }

        case "suggest_edit": {
            return {
                success: true,
                message: `Suggesting edit: "${args.original_text.slice(0, 30)}..." → "${args.suggested_text.slice(0, 30)}..."`,
                action: {
                    type: "suggest",
                    content: args.suggested_text,
                    originalText: args.original_text,
                    metadata: {
                        reason: args.reason
                    }
                }
            };
        }

        case "add_comment": {
            return {
                success: true,
                message: `Adding comment on: "${args.target_text.slice(0, 30)}..."`,
                action: {
                    type: "comment",
                    content: args.comment,
                    originalText: args.target_text
                }
            };
        }

        case "get_selection": {
            const selection = editorContext.getSelection?.();
            if (!selection) {
                return {
                    success: true,
                    message: "No text is currently selected"
                };
            }
            return {
                success: true,
                message: selection
            };
        }

        case "search_document": {
            const content = editorContext.getContent?.() || "";
            const query = args.query.toLowerCase();
            const matches: string[] = [];

            // Simple search - find all occurrences
            let idx = content.toLowerCase().indexOf(query);
            while (idx !== -1 && matches.length < 5) {
                const start = Math.max(0, idx - 30);
                const end = Math.min(content.length, idx + query.length + 30);
                const context = content.slice(start, end);
                matches.push(`...${context}...`);
                idx = content.toLowerCase().indexOf(query, idx + 1);
            }

            if (matches.length === 0) {
                return {
                    success: true,
                    message: `No matches found for "${args.query}"`
                };
            }

            return {
                success: true,
                message: `Found ${matches.length} match(es):\n${matches.join("\n")}`
            };
        }

        default:
            return {
                success: false,
                message: `Unknown writing tool: ${toolName}`
            };
    }
}

/**
 * Check if a tool is a writing tool (vs file system tool)
 */
export function isWritingTool(toolName: string): boolean {
    return WRITING_TOOL_DEFINITIONS.some(t => t.name === toolName);
}
