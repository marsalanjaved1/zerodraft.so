import { createClient } from "@/lib/supabase/server";
import { fuzzyReplace } from "@/lib/utils/fuzzy-match";
import { createSnapshot } from "@/lib/server/versioning";

export interface FileNode {
    id: string;
    title: string;
    type: "file" | "folder";
    path: string;
    content?: string;
}

/**
 * Strip emoji prefixes, leading colons, and extra whitespace from a path.
 * The LLM sometimes copies these from directory listings into fs_read_file calls.
 */
function cleanPath(rawPath: string): string {
    return rawPath
        .replace(/[\u{1F4C1}\u{1F4C2}\u{1F4C4}\u{1F5C2}]/gu, "") // strip folder/file emojis
        .replace(/^[:\s]+/, "")                                     // strip leading ":" and spaces
        .trim();
}

export class FileSystem {
    private workspaceId: string;
    private supabaseClient: any;

    constructor(workspaceId: string, supabaseClient?: any) {
        this.workspaceId = workspaceId;
        this.supabaseClient = supabaseClient;
    }

    private async getClient() {
        return this.supabaseClient || await createClient();
    }

    /**
     * List all files in the workspace recursively
     */
    async listFiles(): Promise<string> {
        const supabase = await this.getClient();
        const { data: documents, error } = await supabase
            .from("documents")
            .select("id, title, type, parent_id")
            .eq("workspace_id", this.workspaceId);

        if (error) throw new Error(`Failed to list files: ${error.message}`);

        // Build a path map to construct full paths
        const docMap = new Map(documents.map((d: any) => [d.id, d]));
        const buildPath = (doc: any): string => {
            let path = doc.title;
            let current = doc;
            while (current.parent_id && docMap.has(current.parent_id)) {
                current = docMap.get(current.parent_id);
                path = `${current.title}/${path}`;
            }
            return path;
        };

        const fileList = documents.map((d: any) => {
            const path = buildPath(d);
            return `${d.type === 'folder' ? '[folder]' : '[file]'} ${path}`;
        }).sort();

        return fileList.join('\n');
    }

    /**
     * Fuzzy find files by name
     */
    async findFiles(pattern: string): Promise<string> {
        const supabase = await this.getClient();
        const { data: documents, error } = await supabase
            .from("documents")
            .select("id, title, type")
            .eq("workspace_id", this.workspaceId)
            .ilike("title", `%${pattern}%`);

        if (error) throw new Error(`Failed to find files: ${error.message}`);

        if (documents.length === 0) return "No files found matching that pattern.";

        return documents.map((d: any) => `- ${d.title} (${d.type}) [ID: ${d.id}]`).join('\n');
    }

    /**
     * Search content of files (using Postgres ILIKE for now, FTS later)
     */
    async searchContent(query: string): Promise<string> {
        const supabase = await this.getClient();
        const { data: documents, error } = await supabase
            .from("documents")
            .select("id, title, content")
            .eq("workspace_id", this.workspaceId)
            .eq("type", "file")
            .ilike("content", `%${query}%`)
            .limit(5);

        if (error) throw new Error(`Failed to search content: ${error.message}`);

        if (documents.length === 0) return "No files found containing that text.";

        return documents.map((d: any) => {
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
        const supabase = await this.getClient();

        // Clean path and extract the filename from the path (last segment)
        const cleaned = cleanPath(path);
        const filename = cleaned.split('/').pop() || cleaned;

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
        const supabase = await this.getClient();

        // Clean path and extract the filename from the path (last segment)
        const cleaned = cleanPath(path);
        const filename = cleaned.split('/').pop() || cleaned;

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
        // Snapshot before edit (fire-and-forget)
        createSnapshot(document.id, "Before file update").catch(() => { });

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
     * Patch a file using search-and-replace (fuzzy matching)
     */
    async patchFile(path: string, searchText: string, replacementText: string): Promise<string> {
        // Read the current content
        const content = await this.readFile(path);
        if (content.startsWith("Error:")) return content;
        if (content === "(empty file)") return `Error: File "${path}" is empty. Use fs_write_file to write content instead.`;

        // Use fuzzy replace to find and replace
        const result = fuzzyReplace(content, searchText, replacementText);

        if (!result.success) {
            return `Error: Could not find "${searchText.slice(0, 80)}..." in ${path}. Read the file first and use the exact text.`;
        }

        // Write back the patched content using updateFile
        return await this.updateFile(path, result.newContent);
    }

    /**
     * Write a file (Create or Update if exists)
     */
    async writeFile(path: string, content: string): Promise<string> {
        const supabase = await this.getClient();

        // Clean path and extract the filename from the path (last segment)
        const cleaned = cleanPath(path);
        const filename = cleaned.split('/').pop() || cleaned;

        // First find the file - SEARCH FOR ALL MATCHES, NOT JUST ONE
        // This handles the case where duplicates already exist
        const { data: documents, error: findError } = await supabase
            .from("documents")
            .select("id, title")
            .eq("workspace_id", this.workspaceId)
            .ilike("title", filename)
            .order('updated_at', { ascending: false }); // Get the most recently updated one

        if (findError || !documents || documents.length === 0) {
            // File doesn't exist, create it
            return await this.createFile(path, content);
        }

        // File exists (possibly multiple copies)
        // We pick the first one (most recent) to update
        const targetDoc = documents[0];

        // Snapshot before edit (fire-and-forget)
        createSnapshot(targetDoc.id, "Before file update").catch(() => { });

        const { error: updateError } = await supabase
            .from("documents")
            .update({ content: content })
            .eq("id", targetDoc.id);

        if (updateError) {
            return `Error updating file: ${updateError.message}`;
        }

        // Optional: If we want to be aggressive, we could delete the other duplicates here
        // But for safety, we'll just log/ignore them and ensure we stick to updating one.

        return `Successfully updated file: ${targetDoc.title}`;
    }

    /**
     * Append content to an existing file
     */
    async appendFile(path: string, content: string): Promise<string> {
        const supabase = await this.getClient();

        // Clean path and extract the filename from the path (last segment)
        const cleaned = cleanPath(path);
        const filename = cleaned.split('/').pop() || cleaned;

        // Find the file
        const { data: document, error: findError } = await supabase
            .from("documents")
            .select("id, title, content")
            .eq("workspace_id", this.workspaceId)
            .ilike("title", filename)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (findError || !document) {
            return `Error: File "${path}" not found. Use fs_write_file to create it first.`;
        }

        // Snapshot before edit (fire-and-forget)
        createSnapshot(document.id, "Before file append").catch(() => { });

        // Append content with newline separator
        const existingContent = document.content || "";
        const newContent = existingContent + "\n" + content;

        const { error: updateError } = await supabase
            .from("documents")
            .update({ content: newContent })
            .eq("id", document.id);

        if (updateError) {
            return `Error appending to file: ${updateError.message}`;
        }

        return `Successfully appended ${content.length} chars to: ${document.title}`;
    }

    /**
     * Create a new file
     */
    private async createFile(path: string, content: string): Promise<string> {
        // Simplified: acts as "create at root" or "create in folder" logic would require resolving paths
        // For now, we'll create at root or just use the name if it has no slashes
        const parts = path.split('/');
        const title = parts.pop() || "Untitled";

        // TODO: Handle folder creation/lookup for nested paths
        // For now, we create everything at root level or simple implementation

        const supabase = await this.getClient();
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
        const supabase = await this.getClient();
        const { error } = await supabase
            .from("documents")
            .delete()
            .eq("id", id)
            .eq("workspace_id", this.workspaceId);

        if (error) throw new Error(`Failed to delete file: ${error.message}`);
        return "Successfully deleted file.";
    }
}
