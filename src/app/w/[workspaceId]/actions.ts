
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseDocx, parsePdf } from "@/lib/importers";

export async function importDocument(workspaceId: string, formData: FormData, parentId: string | null = null) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const supabase = await createClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    let content = "";
    let type = "file";


    // 1. Upload original file to Storage with Service Role (bypass RLS)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${workspaceId}/${fileName}`;

    // Create an admin client just for storage upload to avoid RLS issues
    const { createClient: createAdminClient } = require('@supabase/supabase-js');
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    const { error: uploadError } = await adminSupabase.storage
        .from('workspace-files')
        .upload(filePath, file, {
            contentType: file.type,
            upsert: false
        });

    if (uploadError) {
        console.error("Storage upload failed", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 2. Convert Content
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        content = await parseDocx(buffer);
        type = "file";

    } else if (file.type === "application/pdf") {
        // Get Public URL for fallback PDF viewer
        const { data: { publicUrl } } = supabase.storage.from('workspace-files').getPublicUrl(filePath);

        // Call LlamaParse API to extract text
        try {
            const pdfFormData = new FormData();
            pdfFormData.append('file', file);

            const parseResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/parse-pdf`, {
                method: 'POST',
                body: pdfFormData,
            });

            if (parseResponse.ok) {
                const parseResult = await parseResponse.json();
                // Store extracted markdown as content, with file URL as metadata
                content = JSON.stringify({
                    type: 'pdf',
                    extracted: true,
                    markdown: parseResult.markdown,
                    url: publicUrl,
                    filePath: filePath,
                    mimeType: 'application/pdf',
                    size: file.size
                });
            } else {
                // Fallback to just storing reference if parsing fails
                console.error('PDF parsing failed, storing reference only');
                content = JSON.stringify({
                    type: 'pdf',
                    extracted: false,
                    url: publicUrl,
                    filePath: filePath,
                    mimeType: 'application/pdf',
                    size: file.size
                });
            }
        } catch (parseError) {
            console.error('PDF parsing error:', parseError);
            // Fallback to just storing reference
            content = JSON.stringify({
                type: 'pdf',
                extracted: false,
                url: publicUrl,
                filePath: filePath,
                mimeType: 'application/pdf',
                size: file.size
            });
        }
        type = "file";
    }

    // 3. Create Document Record
    const { data, error } = await supabase
        .from("documents")
        .insert({
            workspace_id: workspaceId,
            parent_id: parentId,
            title: file.name,
            type: type,
            content: content || JSON.stringify({
                storageType: 'upload',
                path: filePath,
                mimeType: file.type,
                size: file.size
            })
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath(`/w/${workspaceId}`);
    return data;
}

export async function createDocument(workspaceId: string, parentId: string | null = null, type: 'file' | 'folder' = 'file') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
        .from('documents')
        .insert({
            workspace_id: workspaceId,
            parent_id: parentId,
            type,
            title: type === 'folder' ? 'New Folder' : 'Untitled',
            content: null // Empty content for new file
        })
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath(`/w/${workspaceId}`)
    return data
}

export async function updateDocumentContent(docId: string, content: string) {
    const supabase = await createClient()

    // We might want to throttle this or verify ownership, RLS handles ownership
    const { error } = await supabase
        .from('documents')
        .update({
            content: content,
            updated_at: new Date().toISOString()
        })
        .eq('id', docId)

    if (error) throw new Error(error.message)
    // No revalidate needed for content updates usually, as it's local state driven + debounced save
}

export async function renameDocument(workspaceId: string, docId: string, newTitle: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('documents')
        .update({ title: newTitle })
        .eq('id', docId)

    if (error) throw new Error(error.message)
    revalidatePath(`/w/${workspaceId}`)
}

export async function deleteDocument(workspaceId: string, docId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

    if (error) throw new Error(error.message)
    revalidatePath(`/w/${workspaceId}`)
}

export async function moveDocument(workspaceId: string, docId: string, newParentId: string | null) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('documents')
        .update({
            parent_id: newParentId,
            updated_at: new Date().toISOString()
        })
        .eq('id', docId)

    if (error) throw new Error(error.message)
    revalidatePath(`/w/${workspaceId}`)
}
