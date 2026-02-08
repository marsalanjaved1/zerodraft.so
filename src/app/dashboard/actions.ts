
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createWorkspace(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data, error } = await supabase
        .from('workspaces')
        .insert({ name, owner_id: user.id })
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/dashboard')
    redirect(`/w/${data.id}`)
}

export async function deleteWorkspace(workspaceId: string) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Soft delete: set deleted_at to now
    const { error } = await supabase
        .from('workspaces')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', workspaceId)
        .eq('owner_id', user.id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/dashboard')
}

export async function restoreWorkspace(workspaceId: string) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { error } = await supabase
        .from('workspaces')
        .update({ deleted_at: null })
        .eq('id', workspaceId)
        .eq('owner_id', user.id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/trash')
}

export async function permanentlyDeleteWorkspace(workspaceId: string) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)
        .eq('owner_id', user.id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/trash')
}

export async function getRecentWorkspaces() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const { data } = await supabase
        .from('workspaces')
        .select('id, name, updated_at')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(5)

    return data || []
}
