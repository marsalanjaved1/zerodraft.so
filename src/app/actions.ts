"use server";

import { FileSystem } from "@/lib/server/file-system";

export async function executeFileSystemTool(workspaceId: string, toolName: string, args: any, overrideContent?: string) {
    if (!workspaceId) throw new Error("Workspace ID is required");

    const fs = new FileSystem(workspaceId);

    try {
        switch (toolName) {
            case "fs_read_file":
                if (overrideContent) return overrideContent;
                return await fs.readFile(args.path);
            case "fs_list_workplace":
            case "fs_list_directory":
                return await fs.listFiles();
            case "fs_find_file":
                return await fs.findFiles(args.pattern);
            case "fs_search_content":
                return await fs.searchContent(args.query);
            case "fs_create_file":
            case "fs_write_file":
                console.log(`[FileSystem] Writing file: ${args.path}`);
                try {
                    const result = await fs.writeFile(args.path, args.content);
                    console.log(`[FileSystem] Successfully wrote file: ${args.path}`);
                    return result;
                } catch (e: any) {
                    console.error(`[FileSystem] Error writing file ${args.path}:`, e);
                    throw e; // Re-throw to be caught by outer catch
                }
            case "fs_append_file":
                console.log(`[FileSystem] Appending to file: ${args.path}`);
                return await fs.appendFile(args.path, args.content);
            case "fs_update_file":
                if (args.search_text) {
                    return await fs.patchFile(args.path, args.search_text, args.replacement_text);
                }
                return await fs.updateFile(args.path, args.replacement_text || args.content);
            case "fs_delete_file":
                return await fs.deleteFile(args.id || args.path);
            default:
                return `Error: Tool '${toolName}' not implemented.`;
        }
    } catch (e: any) {
        return `Error executing ${toolName}: ${e.message}`;
    }
}
