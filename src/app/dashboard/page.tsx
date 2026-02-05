
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createWorkspace } from './actions'

export default async function DashboardPage() {
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
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] font-sans p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8 pb-4 border-b border-[#3c3c3c]">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                        <p className="text-sm text-[#858585] mt-1">Welcome back, {user.email}</p>
                    </div>
                    <form action="/auth/signout" method="post">
                        {/* We'll implement signout later or just use a button for now */}
                        <button className="text-xs hover:text-white transition-colors">Sign Out</button>
                    </form>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Workspace Card */}
                    <div className="bg-[#252526] border border-[#3c3c3c] p-6 rounded-lg hover:border-[#007fd4] transition-colors group">
                        <h2 className="text-lg font-semibold text-white mb-4">Create New Workspace</h2>
                        <form action={createWorkspace} className="flex flex-col gap-4">
                            <input
                                name="name"
                                type="text"
                                placeholder="Workspace Name"
                                required
                                className="bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] p-2 text-sm rounded focus:outline-none focus:border-[#007fd4] focus:ring-1 focus:ring-[#007fd4]"
                            />
                            <button
                                type="submit"
                                className="bg-[#007fd4] hover:bg-[#0069b4] text-white py-2 px-4 text-sm font-medium rounded transition-colors w-full"
                            >
                                Create
                            </button>
                        </form>
                    </div>

                    {/* Existing Workspaces */}
                    {workspaces?.map((workspace) => (
                        <a
                            key={workspace.id}
                            href={`/w/${workspace.id}`}
                            className="block bg-[#252526] border border-[#3c3c3c] p-6 rounded-lg hover:border-[#007fd4] transition-colors group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-[#3c3c3c] rounded text-white">
                                    <span className="material-symbols-outlined text-xl">folder</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white group-hover:text-[#007fd4] transition-colors">
                                {workspace.name}
                            </h3>
                            <p className="text-xs text-[#858585] mt-2">
                                Created {new Date(workspace.created_at).toLocaleDateString()}
                            </p>
                        </a>
                    ))}

                    {(!workspaces || workspaces.length === 0) && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-2 flex items-center justify-center p-8 border border-dashed border-[#3c3c3c] rounded-lg text-[#858585] text-sm italic">
                            No workspaces found. Create one to get started.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
