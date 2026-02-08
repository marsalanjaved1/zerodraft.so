
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen w-full bg-white overflow-hidden font-display text-slate-900">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {children}
            </main>
        </div>
    )
}
