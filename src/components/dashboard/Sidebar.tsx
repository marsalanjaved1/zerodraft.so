
import Link from 'next/link'

export function Sidebar() {
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
                <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors duration-200">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    <span>New Document</span>
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium">
                    <span className="material-symbols-outlined fill">home</span>
                    <span className="text-sm">Home</span>
                </Link>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-surface-light hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">folder</span>
                    <span className="text-sm">My Folders</span>
                </Link>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-surface-light hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">share</span>
                    <span className="text-sm">Shared with me</span>
                </Link>

                <div className="pt-6 pb-2 px-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Folders</p>
                </div>

                {/* Placeholder for recent folders */}
                <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-surface-light hover:text-slate-900 transition-colors group">
                    <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-slate-600">schedule</span>
                    <span className="text-sm truncate">Q3 Strategy</span>
                </Link>
            </nav>

            {/* Bottom Links */}
            <div className="p-3 mt-auto border-t border-border-light space-y-1">
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-surface-light hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">delete</span>
                    <span className="text-sm">Trash</span>
                </Link>
                <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-surface-light hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-sm">Settings</span>
                </Link>
            </div>
        </aside>
    )
}
