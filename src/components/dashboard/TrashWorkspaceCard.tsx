'use client'

import { useState } from 'react'
import { restoreWorkspace, permanentlyDeleteWorkspace } from '@/app/dashboard/actions'
import { useRouter } from 'next/navigation'

interface Workspace {
    id: string
    name: string
    created_at: string
    deleted_at: string
}

interface TrashWorkspaceCardProps {
    workspace: Workspace
}

export function TrashWorkspaceCard({ workspace }: TrashWorkspaceCardProps) {
    const [isRestoring, setIsRestoring] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()

    // Generate a random gradient (matches WorkspaceCard)
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #6B73FF 0%, #000DFF 100%)',
        'linear-gradient(135deg, #D4145A 0%, #FBB03B 100%)',
        'linear-gradient(135deg, #009245 0%, #FCEE21 100%)',
        'linear-gradient(135deg, #662D8C 0%, #ED1E79 100%)'
    ]
    const randomGradient = gradients[workspace.id.charCodeAt(0) % gradients.length]

    const handleRestore = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsRestoring(true)
        await restoreWorkspace(workspace.id)
        setIsRestoring(false)
        router.refresh()
    }

    const handleDeleteForever = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!showConfirm) {
            setShowConfirm(true)
            setTimeout(() => setShowConfirm(false), 3000) // Reset after 3s
            return
        }

        setIsDeleting(true)
        await permanentlyDeleteWorkspace(workspace.id)
        setIsDeleting(false)
        router.refresh()
    }

    return (
        <div className="group flex flex-col bg-white rounded-xl border border-border-light overflow-hidden hover:shadow-lg hover:border-red-200 transition-all duration-200">
            <div className="aspect-[16/9] w-full bg-gray-100 relative overflow-hidden grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ background: randomGradient }}
                ></div>

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                        onClick={handleRestore}
                        disabled={isRestoring || isDeleting}
                        className="p-2 bg-white rounded-lg hover:bg-green-50 text-green-600 shadow-sm transition-colors tooltip"
                        title="Restore"
                    >
                        <span className="material-symbols-outlined">{isRestoring ? 'hourglass_empty' : 'restore_from_trash'}</span>
                    </button>
                    <button
                        onClick={handleDeleteForever}
                        disabled={isRestoring || isDeleting}
                        className={`p-2 rounded-lg shadow-sm transition-all duration-200 tooltip flex items-center gap-1 ${showConfirm ? 'bg-red-500 text-white w-auto px-3' : 'bg-white hover:bg-red-50 text-red-600'}`}
                        title="Delete Forever"
                    >
                        <span className="material-symbols-outlined text-[20px]">{isDeleting ? 'hourglass_empty' : (showConfirm ? 'check' : 'delete_forever')}</span>
                        {showConfirm && <span className="text-xs font-medium">Confirm</span>}
                    </button>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900 leading-tight line-clamp-1">
                        {workspace.name}
                    </h3>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">Deleted {new Date(workspace.deleted_at).toLocaleDateString()}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                        Trash
                    </span>
                </div>
            </div>
        </div>
    )
}
