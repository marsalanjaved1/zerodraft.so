import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fuzzyReplace } from "@/lib/utils/fuzzy-match";

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
        overwrite: z.boolean().optional().default(false).describe("If true, overwrite existing file. If false (default), generate a unique name if file exists."),
    }),
    func: async ({ file_path, content, overwrite }) => {
        try {
            let fullPath = validatePath(file_path);
            let finalPath = file_path;

            // Ensure directory exists
            await fs.mkdir(path.dirname(fullPath), { recursive: true });

            // Check if file exists
            try {
                await fs.access(fullPath);
                // File exists
                if (!overwrite) {
                    // Generate unique filename
                    const dir = path.dirname(fullPath);
                    const ext = path.extname(fullPath);
                    const name = path.basename(fullPath, ext);

                    let counter = 1;
                    let uniqueName = `${name}-${counter}${ext}`;
                    let uniquePath = path.join(dir, uniqueName);

                    while (true) {
                        try {
                            await fs.access(uniquePath);
                            // Exists, try next
                            counter++;
                            uniqueName = `${name}-${counter}${ext}`;
                            uniquePath = path.join(dir, uniqueName);
                        } catch {
                            // Does not exist, use this
                            fullPath = uniquePath;
                            finalPath = path.join(path.dirname(file_path), uniqueName);
                            break;
                        }
                    }
                }
            } catch {
                // File does not exist, proceed with original path
            }

            await fs.writeFile(fullPath, content, "utf-8");
            return `Successfully wrote to ${finalPath}`;
        } catch (err: any) {
            return `Error writing file: ${err.message}`;
        }
    },
});

export const fsRename = new DynamicStructuredTool({
    name: "fs_rename",
    description: "Rename a file or directory.",
    schema: z.object({
        old_path: z.string().describe("Relative path to the existing file or directory"),
        new_path: z.string().describe("Relative path for the new name"),
    }),
    func: async ({ old_path, new_path }) => {
        try {
            const fullOldPath = validatePath(old_path);
            const fullNewPath = validatePath(new_path);

            await fs.rename(fullOldPath, fullNewPath);
            return `Successfully renamed ${old_path} to ${new_path}`;
        } catch (err: any) {
            return `Error renaming: ${err.message}`;
        }
    },
});

export const fsUpdateFile = new DynamicStructuredTool({
    name: "fs_update_file",
    description: "Update a file by replacing specific text. Uses fuzzy matching to handle whitespace differences.",
    schema: z.object({
        file_path: z.string().describe("Relative path to the file to update"),
        search_text: z.string().describe("The text to find in the file (fuzzy matched)"),
        replacement_text: z.string().describe("The text to replace it with"),
    }),
    func: async ({ file_path, search_text, replacement_text }) => {
        try {
            const fullPath = validatePath(file_path);
            const content = await fs.readFile(fullPath, "utf-8");

            const result = fuzzyReplace(content, search_text, replacement_text);

            if (!result.success) {
                return `Error: Could not find text "${search_text.slice(0, 50)}..." in ${file_path} (tried exact, normalized, and fuzzy matching)`;
            }

            await fs.writeFile(fullPath, result.newContent, "utf-8");
            const { matchInfo } = result;
            const simPct = Math.round(matchInfo.similarity * 100);
            return `Successfully updated ${file_path}: ${matchInfo.matchType} match replaced (${simPct}% similar)`;
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


export const fsReadFileSection = new DynamicStructuredTool({
    name: "fs_read_file_section",
    description: "Read a specific section of a file by line numbers. Useful for reading large files without loading the entire content.",
    schema: z.object({
        file_path: z.string().describe("Relative path to the file"),
        start_line: z.number().int().min(1).default(1).describe("Start line number (1-based, inclusive)"),
        end_line: z.number().int().min(1).default(100).describe("End line number (1-based, inclusive)"),
    }),
    func: async ({ file_path, start_line, end_line }) => {
        try {
            const fullPath = validatePath(file_path);
            const content = await fs.readFile(fullPath, "utf-8");
            const lines = content.split("\n");

            const start = Math.max(0, start_line - 1);
            const end = Math.min(lines.length, end_line);

            if (start >= lines.length) {
                return `Error: Start line ${start_line} is beyond file length (${lines.length} lines).`;
            }

            const selectedLines = lines.slice(start, end);
            const numberedLines = selectedLines.map((line, index) => `${start + index + 1}: ${line}`);

            return `File: ${file_path} (Lines ${start + 1}-${end} of ${lines.length})\n--------------------------------------------------\n${numberedLines.join("\n")}`;
        } catch (err: any) {
            return `Error reading file section: ${err.message}`;
        }
    },
});

export const fileSystemTools = [fsReadFile, fsWriteFile, fsRename, fsUpdateFile, fsListDirectory, fsReadFileSection];
