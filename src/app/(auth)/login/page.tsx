
import { login, signup } from '../actions'

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] text-[#cccccc] font-mono">
            <div className="w-full max-w-sm p-8 bg-[#252526] border border-[#3c3c3c] shadow-lg">
                <h1 className="text-2xl font-semibold text-white mb-6 text-center">Login</h1>
                <form className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] p-2 text-sm focus:outline-none focus:border-[#007fd4] focus:ring-1 focus:ring-[#007fd4]"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="password" className="text-sm font-medium">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] p-2 text-sm focus:outline-none focus:border-[#007fd4] focus:ring-1 focus:ring-[#007fd4]"
                        />
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                        <button
                            formAction={login}
                            className="bg-[#007fd4] hover:bg-[#0069b4] text-white py-2 px-4 text-sm font-medium transition-colors"
                        >
                            Log in
                        </button>
                        <button
                            formAction={signup}
                            className="bg-transparent border border-[#3c3c3c] hover:bg-[#3c3c3c] text-[#cccccc] py-2 px-4 text-sm font-medium transition-colors"
                        >
                            Sign up
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
