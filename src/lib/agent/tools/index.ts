import { fileSystemTools } from "./fs-tools";
import { editorTools } from "./editor-tools";

// Export all tools as a single array for the agent
export const allTools = [...fileSystemTools, ...editorTools];

// Re-export individual tool groups
export { fileSystemTools } from "./fs-tools";
export { editorTools } from "./editor-tools";
