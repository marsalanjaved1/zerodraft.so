
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/dashboard/Header'
import { TrashWorkspaceCard } from '@/components/dashboard/TrashWorkspaceCard'

export default async function TrashPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

    return (
        <div className="flex flex-col h-full bg-white">
            <Header />

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-[1400px] mx-auto flex flex-col gap-8">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-2xl">delete</span>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Trash</h2>
                        </div>
                        <p className="text-sm text-slate-500">Items are kept for 30 days before being permanently deleted.</p>
                    </div>

                    {/* Document Grid */}
                    {workspaces && workspaces.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {workspaces.map((workspace) => (
                                <TrashWorkspaceCard key={workspace.id} workspace={workspace} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border border-dashed border-border-light">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">delete_sweep</span>
                            <p className="text-slate-500 font-medium">Trash is empty</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
