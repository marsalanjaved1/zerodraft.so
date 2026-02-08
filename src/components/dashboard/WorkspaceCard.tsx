'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { deleteWorkspace } from '@/app/dashboard/actions'

interface Workspace {
    id: string
    name: string
    created_at: string
    // Add other properties if available in your DB schema
}

interface WorkspaceCardProps {
    workspace: Workspace
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
    const [showMenu, setShowMenu] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Generate a random gradient or placeholder for the card cover
    // In a real app, this might come from the workspace metadata
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #6B73FF 0%, #000DFF 100%)',
        'linear-gradient(135deg, #D4145A 0%, #FBB03B 100%)',
        'linear-gradient(135deg, #009245 0%, #FCEE21 100%)',
        'linear-gradient(135deg, #662D8C 0%, #ED1E79 100%)'
    ]
    const randomGradient = gradients[workspace.id.charCodeAt(0) % gradients.length]

    const timeAgo = (dateParams: string | number | Date) => {
        const date = new Date(dateParams)
        const now = new Date()
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        let interval = seconds / 31536000
        if (interval > 1) return Math.floor(interval) + " years ago"

        interval = seconds / 2592000
        if (interval > 1) return Math.floor(interval) + " months ago"

        interval = seconds / 86400
        if (interval > 1) return Math.floor(interval) + " days ago"

        interval = seconds / 3600
        if (interval > 1) return Math.floor(interval) + " hours ago"

        interval = seconds / 60
        if (interval > 1) return Math.floor(interval) + " minutes ago"

        return Math.floor(seconds) + " seconds ago"
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!showConfirm) {
            setShowConfirm(true)
            return
        }

        setIsDeleting(true)
        await deleteWorkspace(workspace.id)
        setIsDeleting(false)
        setShowMenu(false)
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
                setShowConfirm(false) // Reset confirm state when closing menu
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    return (
        <div className="relative group">
            <Link href={`/w/${workspace.id}`} className="block flex flex-col bg-white rounded-xl border border-border-light overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer h-full">
                <div className="aspect-[16/9] w-full bg-gray-100 relative overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-500 group-hover:scale-105"
                        style={{ background: randomGradient }}
                    ></div>

                    {/* Menu Button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            className="p-1.5 bg-white/90 rounded-md hover:bg-white backdrop-blur-sm shadow-sm text-slate-600 hover:text-slate-900"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                                setShowConfirm(false);
                            }}
                        >
                            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                        </button>
                    </div>
                </div>

                <div className="p-4 flex flex-col gap-1 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-1">
                            {workspace.name}
                        </h3>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-xs text-slate-500">Created {timeAgo(workspace.created_at)}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            Workspace
                        </span>
                    </div>
                </div>
            </Link>

            {/* Dropdown Menu */}
            {showMenu && (
                <div ref={menuRef} className="absolute top-10 right-2 w-48 bg-white rounded-lg shadow-xl border border-border-light z-50 py-1 animation-fade-in origin-top-right">
                    <button
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${showConfirm ? 'bg-red-50 text-red-700 font-medium' : 'text-red-600 hover:bg-red-50'}`}
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {isDeleting ? 'hourglass_empty' : (showConfirm ? 'warning' : 'delete')}
                        </span>
                        {isDeleting ? 'Deleting...' : (showConfirm ? 'Confirm Delete?' : 'Delete Workspace')}
                    </button>
                </div>
            )}
        </div>
    )
}
