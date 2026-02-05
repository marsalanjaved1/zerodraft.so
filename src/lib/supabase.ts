import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Project {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
}

export interface VirtualFile {
    id: string;
    project_id: string;
    path: string;
    content: string;
    embedding?: number[];
    last_updated: string;
}

export interface ChatSession {
    id: string;
    project_id: string;
    history: ChatMessage[];
    created_at: string;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    tool_calls?: ToolCallRecord[];
}

export interface ToolCallRecord {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
}

// Virtual File System API
export const vfs = {
    async listFiles(projectId: string): Promise<VirtualFile[]> {
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("project_id", projectId)
            .order("path");

        if (error) throw error;
        return data || [];
    },

    async readFile(projectId: string, path: string): Promise<VirtualFile | null> {
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("project_id", projectId)
            .eq("path", path)
            .single();

        if (error && error.code !== "PGRST116") throw error;
        return data;
    },

    async writeFile(projectId: string, path: string, content: string): Promise<VirtualFile> {
        const { data, error } = await supabase
            .from("files")
            .upsert(
                {
                    project_id: projectId,
                    path,
                    content,
                    last_updated: new Date().toISOString(),
                },
                { onConflict: "project_id,path" }
            )
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async patchFile(
        projectId: string,
        path: string,
        searchString: string,
        replacement: string
    ): Promise<VirtualFile | null> {
        const file = await vfs.readFile(projectId, path);
        if (!file) return null;

        const newContent = file.content.replace(searchString, replacement);
        return vfs.writeFile(projectId, path, newContent);
    },

    async deleteFile(projectId: string, path: string): Promise<void> {
        const { error } = await supabase
            .from("files")
            .delete()
            .eq("project_id", projectId)
            .eq("path", path);

        if (error) throw error;
    },
};

// Chat Session API
export const chatApi = {
    async getSession(projectId: string): Promise<ChatSession | null> {
        const { data, error } = await supabase
            .from("chat_sessions")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== "PGRST116") throw error;
        return data;
    },

    async createSession(projectId: string): Promise<ChatSession> {
        const { data, error } = await supabase
            .from("chat_sessions")
            .insert({ project_id: projectId, history: [] })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateHistory(sessionId: string, history: ChatMessage[]): Promise<void> {
        const { error } = await supabase
            .from("chat_sessions")
            .update({ history })
            .eq("id", sessionId);

        if (error) throw error;
    },
};
