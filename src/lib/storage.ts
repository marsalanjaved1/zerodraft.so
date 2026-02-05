
import { createClient } from '@/lib/supabase/client'

export async function uploadFile(workspaceId: string, file: File, parentId: string | null = null) {
    const supabase = createClient()

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${workspaceId}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, file)

    if (uploadError) {
        throw uploadError
    }

    // 2. Create Document record
    const { data, error: dbError } = await supabase
        .from('documents')
        .insert({
            workspace_id: workspaceId,
            parent_id: parentId,
            title: file.name,
            type: 'file', // We'll treat it as a file, but content will differ
            content: JSON.stringify({
                storageType: 'upload',
                path: filePath,
                mimeType: file.type,
                size: file.size
            })
        })
        .select()
        .single()

    if (dbError) {
        // Cleanup storage if db fails?
        throw dbError
    }

    return data
}
