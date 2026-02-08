
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createWorkspace } from '@/app/dashboard/actions'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function Sidebar({ recentWorkspaces = [] }: { recentWorkspaces?: any[] }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleCreateNew = async () => {
        const formData = new FormData()
        formData.append('name', 'Untitled Document')

        startTransition(async () => {
            await createWorkspace(formData)
        })
    }

    const showComingSoon = (feature: string) => {
        // simple alert for now, could be a toast
        alert(`${feature} is coming soon!`)
    }

    const isActive = (path: string) => pathname === path

    return (
        <aside className="w-64 h-full flex flex-col border-r border-border-light bg-white shrink-0 transition-all duration-300">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6">
                <div className="flex items-center gap-2 text-slate-900">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    <h1 className="text-lg font-bold tracking-tight">Zerodraft.so</h1>
                </div>
            </div>

            {/* Primary Action */}
            <div className="px-4 py-4">
                <button
                    onClick={handleCreateNew}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors duration-200"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    <span>New Document</span>
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                <Link
                    href="/dashboard"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive('/dashboard') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-surface-light hover:text-slate-900'}`}
                >
                    <span className={`material-symbols-outlined ${isActive('/dashboard') ? 'fill' : ''}`}>home</span>
                    <span className="text-sm">Home</span>
                </Link>
                <button
                    onClick={() => showComingSoon('Shared with me')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-surface-light hover:text-slate-900 transition-colors text-left"
                >
                    <span className="material-symbols-outlined">share</span>
                    <span className="text-sm">Shared with me</span>
                </button>

                <div className="pt-6 pb-2 px-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Workspaces</p>
                </div>

                {recentWorkspaces.map((workspace) => (
                    <Link
                        key={workspace.id}
                        href={`/w/${workspace.id}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-surface-light hover:text-slate-900 transition-colors group"
                    >
                        <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-slate-600">article</span>
                        <span className="text-sm truncate">{workspace.name}</span>
                    </Link>
                ))}

                {recentWorkspaces.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-400 italic">No recent workspaces</div>
                )}
            </nav>

            {/* Bottom Links */}
            <div className="p-3 mt-auto border-t border-border-light space-y-1">
                <Link
                    href="/dashboard/trash"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/dashboard/trash') ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-surface-light hover:text-slate-900'}`}
                >
                    <span className={`material-symbols-outlined ${isActive('/dashboard/trash') ? 'fill' : ''}`}>delete</span>
                    <span className="text-sm">Trash</span>
                </Link>
                <Link
                    href="/settings"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/settings') ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-surface-light hover:text-slate-900'}`}
                >
                    <span className={`material-symbols-outlined ${isActive('/settings') ? 'fill' : ''}`}>settings</span>
                    <span className="text-sm">Settings</span>
                </Link>
            </div>
        </aside>
    )
}
