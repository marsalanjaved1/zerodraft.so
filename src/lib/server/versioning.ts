/**
 * Document Versioning — Snapshot History for Zero Draft
 * 
 * Automatically creates version snapshots when documents are edited.
 * This enables:
 * - Full edit history ("show me what this looked like yesterday")
 * - Undo/restore to any version
 * - Audit trail for agent edits
 */

import { createClient } from "@/lib/supabase/server";

// --- Types ---

export interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: number;
    content: string | null;
    title: string | null;
    created_by: "agent" | "user";
    change_summary: string | null;
    created_at: string;
}

// --- Core Functions ---

/**
 * Create a version snapshot of a document's current state.
 * Call this BEFORE making changes to preserve the "before" state.
 */
export async function createSnapshot(
    documentId: string,
    changeSummary?: string,
    createdBy: "agent" | "user" = "agent"
): Promise<void> {
    try {
        const supabase = await createClient();

        // 1. Get current document content
        const { data: doc, error: docError } = await supabase
            .from("documents")
            .select("content, title")
            .eq("id", documentId)
            .single();

        if (docError || !doc) {
            console.warn("[Versioning] Document not found:", documentId);
            return;
        }

        // 2. Get next version number
        const { data: latestVersion, error: versionError } = await supabase
            .from("document_versions")
            .select("version_number")
            .eq("document_id", documentId)
            .order("version_number", { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextVersion = (latestVersion?.version_number || 0) + 1;

        // 3. Insert snapshot
        const { error: insertError } = await supabase
            .from("document_versions")
            .insert({
                document_id: documentId,
                version_number: nextVersion,
                content: typeof doc.content === "string" ? doc.content : JSON.stringify(doc.content),
                title: doc.title,
                created_by: createdBy,
                change_summary: changeSummary || null,
            });

        if (insertError) {
            console.error("[Versioning] Failed to create snapshot:", insertError);
        }
    } catch (err) {
        // Never let versioning errors break the main flow
        console.error("[Versioning] Error:", err);
    }
}

/**
 * List all versions for a document (most recent first).
 */
export async function listVersions(documentId: string): Promise<DocumentVersion[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false })
        .limit(50);

    if (error) {
        console.error("[Versioning] Failed to list versions:", error);
        return [];
    }

    return (data || []) as DocumentVersion[];
}

/**
 * Restore a document to a specific version.
 */
export async function restoreVersion(
    documentId: string,
    versionNumber: number
): Promise<string> {
    const supabase = await createClient();

    // 1. Get the target version
    const { data: version, error: versionError } = await supabase
        .from("document_versions")
        .select("content, title")
        .eq("document_id", documentId)
        .eq("version_number", versionNumber)
        .single();

    if (versionError || !version) {
        return `Error: Version ${versionNumber} not found for this document.`;
    }

    // 2. Snapshot current state before restoring (so we can undo the undo)
    await createSnapshot(documentId, `Before restoring to v${versionNumber}`);

    // 3. Update the document
    const { error: updateError } = await supabase
        .from("documents")
        .update({
            content: version.content,
            title: version.title,
        })
        .eq("id", documentId);

    if (updateError) {
        return `Error restoring version: ${updateError.message}`;
    }

    return `Successfully restored to version ${versionNumber}.`;
}
