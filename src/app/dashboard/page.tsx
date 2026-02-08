
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createWorkspace } from './actions'
import { Header } from '@/components/dashboard/Header'
import { WorkspaceCard } from '@/components/dashboard/WorkspaceCard'

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: { q?: string }
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    let query = supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (searchParams.q) {
        query = query.ilike('name', `%${searchParams.q}%`)
    }

    const { data: workspaces } = await query

    return (
        <div className="flex flex-col h-full bg-white">
            <Header />

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-[1400px] mx-auto flex flex-col gap-8">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recent Documents</h2>
                    </div>

                    {/* Document Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {workspaces?.map((workspace) => (
                            <WorkspaceCard key={workspace.id} workspace={workspace} />
                        ))}

                        {/* Create New Workspace Card */}
                        <div className="group flex flex-col h-full min-h-[220px]">
                            {/* We'll use a form here to keep the server action working for now */}
                            <form action={createWorkspace} className="flex-1 flex flex-col h-full">
                                <button type="submit" className="flex-1 flex flex-col items-center justify-center bg-surface-light rounded-xl border border-dashed border-border-light hover:border-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer w-full">
                                    <div className="h-12 w-12 rounded-full bg-white border border-border-light flex items-center justify-center mb-3 group-hover:border-primary/50 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">add</span>
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-600 group-hover:text-primary">Create new workspace</h3>
                                    <input type="hidden" name="name" value="Untitled Workspace" />
                                    {/* Auto-naming for now to match the one-click experience */}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
