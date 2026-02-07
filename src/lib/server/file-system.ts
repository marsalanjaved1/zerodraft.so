import { createClient } from "@/lib/supabase/server";

export interface FileNode {
    id: string;
    title: string;
    type: "file" | "folder";
    path: string;
    content?: string;
}

export class FileSystem {
    private workspaceId: string;

    constructor(workspaceId: string) {
        this.workspaceId = workspaceId;
    }

    /**
     * List all files in the workspace recursively
     */
    async listFiles(): Promise<string> {
        const supabase = await createClient();
        const { data: documents, error } = await supabase
            .from("documents")
            .select("id, title, type, parent_id")
            .eq("workspace_id", this.workspaceId);

        if (error) throw new Error(`Failed to list files: ${error.message}`);

        // Build a path map to construct full paths
        const docMap = new Map(documents.map(d => [d.id, d]));
        const buildPath = (doc: any): string => {
            let path = doc.title;
            let current = doc;
            while (current.parent_id && docMap.has(current.parent_id)) {
                current = docMap.get(current.parent_id);
                path = `${current.title}/${path}`;
            }
            return path;
        };

        const fileList = documents.map(d => {
            const path = buildPath(d);
            return `${d.type === 'folder' ? '📂' : '📄'} ${path}`;
        }).sort();

        return fileList.join('\n');
    }

    /**
     * Fuzzy find files by name
     */
    async findFiles(pattern: string): Promise<string> {
        const supabase = await createClient();
        const { data: documents, error } = await supabase
            .from("documents")
            .select("id, title, type")
            .eq("workspace_id", this.workspaceId)
            .ilike("title", `%${pattern}%`);

        if (error) throw new Error(`Failed to find files: ${error.message}`);

        if (documents.length === 0) return "No files found matching that pattern.";

        return documents.map(d => `- ${d.title} (${d.type}) [ID: ${d.id}]`).join('\n');
    }

    /**
     * Search content of files (using Postgres ILIKE for now, FTS later)
     */
    async searchContent(query: string): Promise<string> {
        const supabase = await createClient();
        const { data: documents, error } = await supabase
            .from("documents")
            .select("id, title, content")
            .eq("workspace_id", this.workspaceId)
            .eq("type", "file")
            .ilike("content", `%${query}%`)
            .limit(5);

        if (error) throw new Error(`Failed to search content: ${error.message}`);

        if (documents.length === 0) return "No files found containing that text.";

        return documents.map(d => {
            const contextIndex = d.content.toLowerCase().indexOf(query.toLowerCase());
            const start = Math.max(0, contextIndex - 50);
            const end = Math.min(d.content.length, contextIndex + query.length + 50);
            const snippet = d.content.substring(start, end).replace(/\n/g, ' ');
            return `📄 ${d.title}\n   ...${snippet}...`;
        }).join('\n\n');
    }

    /**
     * Read a file by title/path
     */
    async readFile(path: string): Promise<string> {
        const supabase = await createClient();

        // Extract the filename from the path (last segment)
        const filename = path.split('/').pop() || path;

        const { data: document, error } = await supabase
            .from("documents")
            .select("id, title, content, type")
            .eq("workspace_id", this.workspaceId)
            .ilike("title", filename)
            .single();

        if (error || !document) {
            return `Error: File "${path}" not found in workspace.`;
        }

        if (document.type === "folder") {
            return `Error: "${path}" is a folder, not a file.`;
        }

        return document.content || "(empty file)";
    }

    /**
     * Update a file's content by title/path
     */
    async updateFile(path: string, newContent: string): Promise<string> {
        const supabase = await createClient();

        // Extract the filename from the path (last segment)
        const filename = path.split('/').pop() || path;

        // First find the file
        const { data: document, error: findError } = await supabase
            .from("documents")
            .select("id, title")
            .eq("workspace_id", this.workspaceId)
            .ilike("title", filename)
            .single();

        if (findError || !document) {
            return `Error: File "${path}" not found in workspace.`;
        }

        // Then update it
        const { error: updateError } = await supabase
            .from("documents")
            .update({ content: newContent })
            .eq("id", document.id);

        if (updateError) {
            return `Error updating file: ${updateError.message}`;
        }

        return `Successfully updated file: ${document.title}`;
    }

    /**
     * Create a new file
     */
    async createFile(path: string, content: string): Promise<string> {
        // Simplified: acts as "create at root" or "create in folder" logic would require resolving paths
        // For now, we'll create at root or just use the name if it has no slashes
        const parts = path.split('/');
        const title = parts.pop() || "Untitled";

        // TODO: Handle folder creation/lookup for nested paths
        // For now, we create everything at root level or simple implementation

        const supabase = await createClient();
        const { data, error } = await supabase
            .from("documents")
            .insert({
                workspace_id: this.workspaceId,
                title: title,
                type: "file",
                content: content,
                // parent_id: ... resolves to root if null
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create file: ${error.message}`);
        return `Successfully created file: ${title}`;
    }

    /**
     * Delete a file
     */
    async deleteFile(id: string): Promise<string> {
        const supabase = await createClient();
        const { error } = await supabase
            .from("documents")
            .delete()
            .eq("id", id)
            .eq("workspace_id", this.workspaceId);

        if (error) throw new Error(`Failed to delete file: ${error.message}`);
        return "Successfully deleted file.";
    }
}
