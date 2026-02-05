
export default function AuthErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] text-[#cccccc] font-mono">
            <div className="w-full max-w-sm p-8 bg-[#252526] border border-[#3c3c3c] shadow-lg text-center">
                <h1 className="text-xl font-semibold text-[#f48771] mb-2">Authentication Error</h1>
                <p className="text-sm mb-6">Something went wrong. Please try again.</p>
                <a
                    href="/login"
                    className="bg-[#007fd4] hover:bg-[#0069b4] text-white py-2 px-4 text-sm font-medium transition-colors inline-block"
                >
                    Back to Login
                </a>
            </div>
        </div>
    )
}
