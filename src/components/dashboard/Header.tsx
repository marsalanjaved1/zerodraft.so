'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'

export function Header() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [user, setUser] = useState<any>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const supabase = createClient()
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams(searchParams)
        if (searchQuery) {
            params.set('q', searchQuery)
        } else {
            params.delete('q')
        }
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // Placeholder avatar if user image is missing
    const userImage = user?.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_vVt5oxLnIjCk1j-J0x5XM0vNpOqhuBv5GHp2uRVHhsAYEblmcawhLRRaaUUFPUxyk2svK_rkjeIo-mC4NIVg48vyVruVrTRZcqSx7FHSOvemFwHPtPk3PbW7u9INXR5VuQPaOYd6XFCpNa4PBl1FO7Zvu9raIBP4L30-unLpruld12-olp_pnRFjHBzFO2ee7yj6WDff69Yzkjz4Rqo2B1QvSENikXnh-wxh4739Z5ZON4YJ-bazCcio6Ahqc8BCKBylPpiEzR_R'

    return (
        <header className="h-16 border-b border-border-light flex items-center justify-between px-8 bg-white shrink-0 z-10 relative">
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary">search</span>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-surface-light text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all shadow-sm"
                        placeholder="Search your documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4 pl-8">
                <button className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-surface-light transition-colors relative">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="h-8 w-[1px] bg-border-light"></div>

                <div className="relative" ref={menuRef}>
                    <button
                        className="flex items-center gap-2 group"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div
                            className="w-9 h-9 rounded-full bg-cover bg-center border border-border-light"
                            style={{ backgroundImage: `url('${userImage}')` }}
                            title={user?.email || 'User'}
                        ></div>
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 text-sm">expand_more</span>
                    </button>

                    {showUserMenu && (
                        <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-xl border border-border-light z-50 py-1 animation-fade-in origin-top-right">
                            <div className="px-4 py-2 border-b border-border-light">
                                <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                                <p className="text-xs text-slate-500">Personal Workspace</p>
                            </div>
                            <Link href="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">settings</span>
                                Settings
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
