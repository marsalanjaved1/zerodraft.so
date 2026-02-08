
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/dashboard/Header'

export default async function SettingsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <Header />

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-2xl mx-auto space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
                        <p className="text-slate-500 mt-1">Manage your account and preferences.</p>
                    </div>

                    {/* Profile Section */}
                    <section className="bg-white p-6 rounded-xl border border-border-light shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <div className="p-2 bg-slate-50 rounded-md border border-border-light text-slate-600">
                                    {user.email}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
                                <div className="p-2 bg-slate-50 rounded-md border border-border-light text-slate-500 text-sm font-mono">
                                    {user.id}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Placeholder for other settings */}
                    <section className="bg-white p-6 rounded-xl border border-border-light shadow-sm opacity-60">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Appearance</h3>
                        <p className="text-sm text-slate-500 mb-4">Customize the look and feel of your workspace.</p>
                        <div className="flex items-center gap-4">
                            <div className="h-24 w-1/3 bg-slate-100 rounded-lg border-2 border-primary"></div>
                            <div className="h-24 w-1/3 bg-slate-900 rounded-lg border border-border-light"></div>
                            <div className="h-24 w-1/3 bg-slate-100 rounded-lg border border-border-light"></div>
                        </div>
                        <p className="text-xs text-orange-600 mt-4 font-medium">Coming soon</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
