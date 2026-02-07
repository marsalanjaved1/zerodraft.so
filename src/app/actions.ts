"use server";

import { FileSystem } from "@/lib/server/file-system";

export async function executeFileSystemTool(workspaceId: string, toolName: string, args: any) {
    if (!workspaceId) throw new Error("Workspace ID is required");

    const fs = new FileSystem(workspaceId);

    try {
        switch (toolName) {
            case "fs_read_file":
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
                return await fs.createFile(args.path, args.content);
            case "fs_update_file":
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
