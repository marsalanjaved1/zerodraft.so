import { z } from "zod";
import { tool } from "ai";

// =============================================
// Workspace Tools (Virtual File System)
// =============================================

export const fsListFiles = tool({
    description: "List all files in the project's virtual file system",
    inputSchema: z.object({
        project_id: z.string().describe("The project ID to list files from"),
    }),
});

export const fsReadFile = tool({
    description: "Read the content of a file from the virtual file system",
    inputSchema: z.object({
        file_path: z.string().describe("The path to the file to read"),
    }),
});

export const fsWriteFile = tool({
    description: "Create or overwrite a file in the virtual file system",
    inputSchema: z.object({
        file_path: z.string().describe("The path where the file should be written"),
        content: z.string().describe("The full content to write to the file"),
    }),
});

export const fsPatchFile = tool({
    description: "Replace specific text in a file",
    inputSchema: z.object({
        file_path: z.string().describe("The path to the file to patch"),
        search_string: z.string().describe("The exact text to search for"),
        replacement: z.string().describe("The replacement text"),
    }),
});

// =============================================
// External Tools (Mocked for MVP)
// =============================================

export const slackReadChannel = tool({
    description: "Read messages from a Slack channel",
    inputSchema: z.object({
        channel_name: z.string().describe("The Slack channel name"),
        limit: z.number().optional().describe("Maximum messages to retrieve"),
    }),
});

export const trackerGetIssues = tool({
    description: "Get issues from the project tracker",
    inputSchema: z.object({
        status: z.enum(["backlog", "in_progress", "done", "all"]).describe("Filter by status"),
    }),
});

export const webSearch = tool({
    description: "Search the web for information",
    inputSchema: z.object({
        query: z.string().describe("The search query"),
    }),
});

// Export all tools
export const agentTools = {
    fs_list_files: fsListFiles,
    fs_read_file: fsReadFile,
    fs_write_file: fsWriteFile,
    fs_patch_file: fsPatchFile,
    slack_read_channel: slackReadChannel,
    tracker_get_issues: trackerGetIssues,
    web_search: webSearch,
};
