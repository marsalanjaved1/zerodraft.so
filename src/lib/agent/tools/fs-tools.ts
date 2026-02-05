import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const WORKSPACE_ROOT = process.cwd();

// Security: Ensure path is within workspace
function validatePath(filePath: string): string {
    const resolved = path.resolve(WORKSPACE_ROOT, filePath);
    if (!resolved.startsWith(WORKSPACE_ROOT)) {
        throw new Error("Access denied: Path outside workspace");
    }
    return resolved;
}

// Ignore patterns for listing
const IGNORE_PATTERNS = ["node_modules", ".git", ".next", "dist", "build", ".DS_Store"];

export const fsReadFile = new DynamicStructuredTool({
    name: "fs_read_file",
    description: "Read the content of a file from the workspace. Use this to view documents, code, or any text file.",
    schema: z.object({
        file_path: z.string().describe("Relative path to the file (e.g., 'Specs/PRD.md')"),
    }),
    func: async ({ file_path }) => {
        try {
            const fullPath = validatePath(file_path);
            const content = await fs.readFile(fullPath, "utf-8");
            return content;
        } catch (err: any) {
            return `Error reading file: ${err.message}`;
        }
    },
});

export const fsWriteFile = new DynamicStructuredTool({
    name: "fs_write_file",
    description: "Create a new file or overwrite an existing file with the given content.",
    schema: z.object({
        file_path: z.string().describe("Relative path where to save the file"),
        content: z.string().describe("The full content to write to the file"),
    }),
    func: async ({ file_path, content }) => {
        try {
            const fullPath = validatePath(file_path);
            // Ensure directory exists
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content, "utf-8");
            return `Successfully wrote to ${file_path}`;
        } catch (err: any) {
            return `Error writing file: ${err.message}`;
        }
    },
});

export const fsUpdateFile = new DynamicStructuredTool({
    name: "fs_update_file",
    description: "Update a file by replacing specific text. Finds the search_text and replaces it with replacement_text.",
    schema: z.object({
        file_path: z.string().describe("Relative path to the file to update"),
        search_text: z.string().describe("The exact text to find in the file"),
        replacement_text: z.string().describe("The text to replace it with"),
    }),
    func: async ({ file_path, search_text, replacement_text }) => {
        try {
            const fullPath = validatePath(file_path);
            const content = await fs.readFile(fullPath, "utf-8");

            if (!content.includes(search_text)) {
                return `Error: Could not find the text "${search_text}" in ${file_path}`;
            }

            const newContent = content.replace(search_text, replacement_text);
            await fs.writeFile(fullPath, newContent, "utf-8");
            return `Successfully updated ${file_path}: replaced "${search_text}" with "${replacement_text}"`;
        } catch (err: any) {
            return `Error updating file: ${err.message}`;
        }
    },
});

export const fsListDirectory = new DynamicStructuredTool({
    name: "fs_list_directory",
    description: "List all files in a directory. Returns file names and types.",
    schema: z.object({
        dir_path: z.string().default(".").describe("Relative path to directory (defaults to root)"),
        recursive: z.boolean().default(false).describe("Whether to list files recursively"),
    }),
    func: async ({ dir_path, recursive }) => {
        try {
            const fullPath = validatePath(dir_path);

            const listFiles = async (dir: string, depth: number = 0): Promise<string[]> => {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                const results: string[] = [];

                for (const entry of entries) {
                    if (IGNORE_PATTERNS.includes(entry.name)) continue;

                    const relPath = path.relative(WORKSPACE_ROOT, path.join(dir, entry.name));
                    const prefix = "  ".repeat(depth);

                    if (entry.isDirectory()) {
                        results.push(`${prefix}📁 ${relPath}/`);
                        if (recursive && depth < 3) {
                            results.push(...await listFiles(path.join(dir, entry.name), depth + 1));
                        }
                    } else {
                        results.push(`${prefix}📄 ${relPath}`);
                    }
                }
                return results;
            };

            const files = await listFiles(fullPath);
            if (files.length === 0) {
                return "Directory is empty";
            }
            return files.join("\n");
        } catch (err: any) {
            return `Error listing directory: ${err.message}`;
        }
    },
});

export const fileSystemTools = [fsReadFile, fsWriteFile, fsUpdateFile, fsListDirectory];
