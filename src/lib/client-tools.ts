/**
 * Client-side tool executor
 * Tools operate on the files array (sidebar data) in the browser
 */

import type { FileNode } from "@/lib/types";

export interface ToolResult {
    success: boolean;
    result: string;
    updatedFiles?: FileNode[];
}

/**
 * Find a file by path in the file tree
 */
function findFile(files: FileNode[], path: string): FileNode | null {
    // Normalize path (remove leading slash)
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    for (const file of files) {
        if (file.path === normalizedPath) {
            return file;
        }
        if (file.children) {
            const found = findFile(file.children, path);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Get all files in a directory (or root)
 */
function listFilesInDir(files: FileNode[], dirPath: string = "/"): FileNode[] {
    const normalizedPath = dirPath === "/" || dirPath === "." ? "" : (dirPath.startsWith("/") ? dirPath : `/${dirPath}`);

    const results: FileNode[] = [];

    const traverse = (nodes: FileNode[], currentPath: string = "") => {
        for (const node of nodes) {
            // Check if this node is in the target directory
            if (normalizedPath === "" || node.path.startsWith(normalizedPath)) {
                results.push(node);
            }
            if (node.children) {
                traverse(node.children, node.path);
            }
        }
    };

    traverse(files);
    return results;
}

/**
 * Deep clone file tree to enable immutable updates
 */
function cloneFiles(files: FileNode[]): FileNode[] {
    return files.map(f => ({
        ...f,
        children: f.children ? cloneFiles(f.children) : undefined
    }));
}

/**
 * Update a file's content in the tree (immutable)
 */
function updateFileContent(files: FileNode[], path: string, content: string): FileNode[] {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const cloned = cloneFiles(files);

    const update = (nodes: FileNode[]): boolean => {
        for (const node of nodes) {
            if (node.path === normalizedPath) {
                node.content = content;
                return true;
            }
            if (node.children && update(node.children)) {
                return true;
            }
        }
        return false;
    };

    update(cloned);
    return cloned;
}

/**
 * Create a new file in the tree (immutable)
 */
function createFile(files: FileNode[], path: string, content: string): FileNode[] {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const cloned = cloneFiles(files);

    // Parse path to determine parent folder
    const parts = normalizedPath.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    const parentPath = "/" + parts.join("/");

    const newFile: FileNode = {
        id: `file_${Date.now()}`,
        name: fileName,
        path: normalizedPath,
        type: "file",
        content
    };

    // If in root
    if (parts.length === 0) {
        cloned.push(newFile);
        return cloned;
    }

    // Find parent folder and add
    const addToParent = (nodes: FileNode[]): boolean => {
        for (const node of nodes) {
            if (node.path === parentPath && node.type === "folder") {
                node.children = node.children || [];
                node.children.push(newFile);
                return true;
            }
            if (node.children && addToParent(node.children)) {
                return true;
            }
        }
        return false;
    };

    addToParent(cloned);
    return cloned;
}

// Tool Definitions
export const TOOL_DEFINITIONS = [
    {
        name: "fs_read_file",
        description: "Read the content of a file from the workspace",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file (e.g., 'Specs/PRD.md')" }
            },
            required: ["path"]
        }
    },
    {
        name: "fs_write_file",
        description: "Create or overwrite a file in the workspace",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" },
                content: { type: "string", description: "Content to write" }
            },
            required: ["path", "content"]
        }
    },
    {
        name: "fs_update_file",
        description: "Update a file by replacing specific text",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" },
                search_text: { type: "string", description: "Text to find" },
                replacement_text: { type: "string", description: "Text to replace with" }
            },
            required: ["path", "search_text", "replacement_text"]
        }
    },
    {
        name: "fs_list_directory",
        description: "List all files in a directory",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Directory path (defaults to root)" }
            }
        }
    }
];

/**
 * Execute a tool against the files state
 */
export function executeTool(
    files: FileNode[],
    toolName: string,
    args: Record<string, any>
): ToolResult {
    switch (toolName) {
        case "fs_read_file": {
            const file = findFile(files, args.path);
            if (!file) {
                return { success: false, result: `File not found: ${args.path}` };
            }
            if (file.type === "folder") {
                return { success: false, result: `${args.path} is a folder, not a file` };
            }
            return { success: true, result: file.content || "(empty file)" };
        }

        case "fs_write_file": {
            const existing = findFile(files, args.path);
            let updatedFiles: FileNode[];

            if (existing) {
                updatedFiles = updateFileContent(files, args.path, args.content);
            } else {
                updatedFiles = createFile(files, args.path, args.content);
            }

            return {
                success: true,
                result: `Successfully wrote to ${args.path}`,
                updatedFiles
            };
        }

        case "fs_update_file": {
            const file = findFile(files, args.path);
            if (!file) {
                return { success: false, result: `File not found: ${args.path}` };
            }
            if (!file.content?.includes(args.search_text)) {
                return { success: false, result: `Text "${args.search_text}" not found in ${args.path}` };
            }

            const newContent = file.content.replace(args.search_text, args.replacement_text);
            const updatedFiles = updateFileContent(files, args.path, newContent);

            return {
                success: true,
                result: `Updated ${args.path}: replaced "${args.search_text}" with "${args.replacement_text}"`,
                updatedFiles
            };
        }

        case "fs_list_directory": {
            const dirPath = args.path || "/";
            const filesInDir = listFilesInDir(files, dirPath);

            if (filesInDir.length === 0) {
                return { success: true, result: `No files found in ${dirPath}` };
            }

            const listing = filesInDir
                .map(f => `${f.type === "folder" ? "📁" : "📄"} ${f.path}`)
                .join("\n");

            return { success: true, result: listing };
        }

        default:
            return { success: false, result: `Unknown tool: ${toolName}` };
    }
}
