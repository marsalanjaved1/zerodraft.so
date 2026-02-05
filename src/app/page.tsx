
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] text-[#cccccc] font-sans">
      <div className="max-w-2xl text-center p-8">
        <h1 className="text-4xl font-bold text-white mb-6">Product Engineering Workspace</h1>
        <p className="text-lg text-[#858585] mb-8">
          A unified environment for Product Managers and Engineers.
          Manage specs, docs, and code with AI assistance.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-[#007fd4] hover:bg-[#0069b4] text-white py-3 px-8 rounded-full text-base font-medium transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="bg-[#252526] hover:bg-[#2d2d2e] border border-[#3c3c3c] text-white py-3 px-8 rounded-full text-base font-medium transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  )
}
