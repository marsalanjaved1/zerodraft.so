"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentAnimation } from "@/components/AgentAnimation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface HomeClientProps {
    user: User | null;
}

type PersonaTab = "pm" | "fiction";

export default function HomeClient({ user }: HomeClientProps) {
    const [activeTab, setActiveTab] = useState<PersonaTab>("fiction");
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setErrorMsg("");

        try {
            const { error } = await supabase
                .from("waitlist")
                .insert([{ email: email.trim() }]);

            if (error) {
                // Code 23505 is unique violation in Postgres
                if (error.code === "23505") {
                    setErrorMsg("You're already on the waitlist!");
                } else {
                    setErrorMsg("Something went wrong. Please try again.");
                    console.error("Waitlist insertion error:", error);
                }
            } else {
                setSubmitted(true);
                setEmail("");
            }
        } catch (err) {
            setErrorMsg("An unexpected error occurred.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-[#111318] selection:bg-primary/20">
            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-[#f0f2f4] bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                    <div className="flex items-center gap-2">
                        <div className="text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl font-bold">edit_note</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-[#111318] serif-headline">zerodraft.so</h2>
                    </div>
                    <nav className="hidden md:flex flex-1 justify-center gap-10">
                        <Link className="text-sm font-medium text-[#616f89] hover:text-primary transition-colors" href="#story">
                            Why I Built This
                        </Link>
                        <Link className="text-sm font-medium text-[#616f89] hover:text-primary transition-colors" href="#features">
                            Features
                        </Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/marsalanjaved1/zerodraft.so"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex text-sm font-bold text-[#111318] px-4 py-2 hover:bg-[#f0f2f4] rounded-lg transition-colors items-center gap-2"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                            </svg>
                            GitHub
                        </a>
                        <a href="#hero-email" className="flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary/90 transition-all">
                            Waitlist
                        </a>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-10 lg:py-32">
                    <div className="mx-auto max-w-4xl flex flex-col items-center">
                        {/* Generic badge */}
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                            <span className="material-symbols-outlined text-base">bolt</span>
                            AI-Powered Writing Partner
                        </div>

                        <h1 className="serif-headline text-5xl font-semibold leading-[1.1] tracking-tight text-[#111318] sm:text-7xl lg:text-8xl">
                            Write with AI.<br />Stay in control.
                        </h1>
                        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#616f89] sm:text-xl">
                            ZeroDraft gathers your research, connects your sources, and suggests edits directly in the editor — with full track changes. You accept, reject, or revise every word.
                        </p>

                        {/* Stat bar */}
                        <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-10">
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-[#111318] sm:text-3xl">10×</span>
                                <span className="text-xs text-[#616f89] mt-1">less context gathering</span>
                            </div>
                            <div className="w-px h-12 bg-[#e5e7eb] hidden sm:block"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-[#111318] sm:text-3xl">100%</span>
                                <span className="text-xs text-[#616f89] mt-1">your voice</span>
                            </div>
                            <div className="w-px h-12 bg-[#e5e7eb] hidden sm:block"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-[#111318] sm:text-3xl">Open</span>
                                <span className="text-xs text-[#616f89] mt-1">source & transparent</span>
                            </div>
                        </div>

                        <div className="mt-10 w-full max-w-md mx-auto" id="hero-email">
                            {submitted ? (
                                <div className="flex flex-col items-center justify-center gap-2 h-14 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        You&apos;re on the waitlist! We&apos;ll be in touch soon.
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isSubmitting}
                                        placeholder="you@email.com"
                                        className="flex-1 h-14 px-5 rounded-lg border border-[#dbdfe6] bg-white text-base text-[#111318] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] disabled:opacity-50"
                                    />
                                    <button type="submit" disabled={isSubmitting} className="flex h-14 min-w-[180px] items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all">
                                        {isSubmitting ? "Joining..." : "Join Waitlist"}
                                    </button>
                                </form>
                            )}
                            {errorMsg && <p className="mt-2 text-sm text-red-500 text-center font-medium">{errorMsg}</p>}
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#616f89] font-medium">
                                <div className="flex -space-x-2">
                                    <div className="size-6 rounded-full border-2 border-[#f9fafb] bg-amber-100 flex items-center justify-center text-[10px] text-amber-700 font-bold">A</div>
                                    <div className="size-6 rounded-full border-2 border-[#f9fafb] bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 font-bold">T</div>
                                    <div className="size-6 rounded-full border-2 border-[#f9fafb] bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold">M</div>
                                </div>
                                <span>Join 200+ writers on the waitlist</span>
                            </div>
                            <p className="mt-3 text-xs text-[#9ca3af] text-center">Free during beta · No credit card required · Open source</p>
                        </div>
                    </div>

                    {/* Product Preview — Tabbed Demo */}
                    <div className="mt-20 max-w-6xl mx-auto lg:mt-32">
                        {/* Persona Tabs */}
                        <div className="flex justify-center mb-8">
                            <div className="inline-flex items-center rounded-xl bg-[#f0f2f4] p-1.5 gap-1">
                                {/*<button
                                    onClick={() => setActiveTab("pm")}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "pm"
                                        ? "bg-white text-[#111318] shadow-sm"
                                        : "text-[#616f89] hover:text-[#111318]"
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-base">dashboard</span>
                                    Product Manager
                                </button>*/}
                                <button
                                    onClick={() => setActiveTab("fiction")}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "fiction"
                                        ? "bg-white text-[#111318] shadow-sm"
                                        : "text-[#616f89] hover:text-[#111318]"
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-base">auto_stories</span>
                                    Fiction Writer
                                </button>
                            </div>
                        </div>

                        {/* Integration pills — contextual */}
                        <div className="flex justify-center mb-6 gap-3 flex-wrap">
                            {activeTab === "pm" ? (
                                <>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2D8CFF]/5 border border-[#2D8CFF]/10 text-sm font-medium text-[#2D8CFF]">
                                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-4.865-3.33a.482.482 0 0 0-.498.028l-2.937 2.052V9.2c0-.66-.54-1.2-1.2-1.2H6c-.66 0-1.2.54-1.2 1.2v5.6c0 .66.54 1.2 1.2 1.2h8.5c.66 0 1.2-.54 1.2-1.2v-1.55l2.937 2.052a.48.48 0 0 0 .498.028.502.502 0 0 0 .265-.448V9.118a.502.502 0 0 0-.265-.448z" /></svg>
                                        Zoom
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4A154B]/5 border border-[#4A154B]/10 text-sm font-medium text-[#4A154B]">
                                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                                        Slack
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0052CC]/5 border border-[#0052CC]/10 text-sm font-medium text-[#0052CC]">
                                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.5V1.005A1.005 1.005 0 0 0 23.013 0z" /></svg>
                                        Jira
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/10 text-sm font-medium text-amber-700">
                                        <span className="material-symbols-outlined text-base">menu_book</span>
                                        Character Notes
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-sm font-medium text-emerald-700">
                                        <span className="material-symbols-outlined text-base">public</span>
                                        World Building
                                    </div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/5 border border-violet-500/10 text-sm font-medium text-violet-700">
                                        <span className="material-symbols-outlined text-base">description</span>
                                        Manuscript
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="overflow-hidden rounded-xl border border-[#dbdfe6] bg-[#fcfcfd] p-2 shadow-2xl">
                            <div className="rounded-lg border border-[#dbdfe6] bg-white shadow-inner overflow-hidden">
                                <div className="flex items-center gap-2 border-b border-[#dbdfe6] bg-[#f8f9fa] px-4 py-3">
                                    <div className="flex gap-1.5">
                                        <div className="size-3 rounded-full bg-[#ff5f57]"></div>
                                        <div className="size-3 rounded-full bg-[#febc2e]"></div>
                                        <div className="size-3 rounded-full bg-[#28c840]"></div>
                                    </div>
                                    <div className="mx-auto text-xs font-medium text-[#616f89]">
                                        {activeTab === "pm" ? "SSO_PRD.md" : "Chapter_3_Draft.md"} — zerodraft.so
                                    </div>
                                </div>
                                {/* Agent Animation Component */}
                                <div className="h-[600px] w-full bg-white relative">
                                    <AgentAnimation activeScenarioId={activeTab} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Origin Story */}
                <section className="mx-auto max-w-5xl px-6 py-24 lg:px-10" id="story">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="prose prose-lg text-[#616f89] leading-relaxed">
                            <h2 className="serif-headline text-3xl font-bold text-[#111318] mb-8">Why I built this.</h2>
                            <p className="mb-6">
                                I work as a software engineer at Amazon. Every day, I use AI tools like Cursor to blast through code. The
                                context is instant, and I feel superhuman.
                            </p>
                            <p className="mb-6">
                                Then I watched our PM spend 3 hours copy-pasting Slack threads into a Google Doc to write a single PRD. A writer friend showed me their workflow — 12 open tabs of research notes, timelines, and character sheets, manually piecing together a chapter draft.
                            </p>
                            <p className="mb-6 font-bold text-[#111318]">
                                Engineers got Cursor. Writers got... nothing.
                            </p>
                            <p className="mb-6">
                                I built ZeroDraft to bridge that gap. An agentic editor that connects to your sources, pulls context automatically, and writes documents directly — with full track changes, not a chat window.
                            </p>

                            <div className="flex items-center gap-3 mt-8">
                                <div className="size-10 rounded-full bg-black/5 overflow-hidden">
                                    <img src="/images/founder.png" alt="Arsalan" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="font-bold text-[#111318] text-sm">Arsalan</div>
                                    <div className="text-xs text-[#616f89]">Creator of ZeroDraft</div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="aspect-[4/5] relative rounded-2xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-all duration-500">
                                <img
                                    src="/images/founder.png"
                                    alt="Arsalan Javed, Creator of ZeroDraft"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                <div className="absolute bottom-6 left-6 right-6 text-white">
                                    <div className="text-lg font-bold serif-headline">&quot;It&apos;s Cursor, but for writers.&quot;</div>
                                </div>
                            </div>
                            <div className="absolute -z-10 top-10 -right-10 w-full h-full rounded-2xl border-2 border-dashed border-gray-200"></div>
                        </div>
                    </div>
                </section>

                {/* Feature Grid — Generalized */}
                <section className="bg-[#fcfcfd] border-y border-[#f0f2f4] py-24" id="features">
                    <div className="mx-auto max-w-7xl px-6 lg:px-10">
                        <div className="text-center mb-16">
                            <h2 className="serif-headline text-3xl font-bold text-[#111318] sm:text-4xl">Built for how you actually write.</h2>
                            <p className="mt-4 text-lg text-[#616f89] max-w-2xl mx-auto">Not another content generator. A workspace that keeps you in the driver&apos;s seat.</p>
                        </div>
                        <div className="grid gap-12 md:grid-cols-3">
                            <div className="flex flex-col gap-4">
                                <div className="flex size-12 items-center justify-center rounded-lg bg-[#111318] text-white">
                                    <span className="material-symbols-outlined">cable</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#111318]">Gathers Context So You Don&apos;t Have To</h3>
                                <p className="text-[#616f89] leading-relaxed">
                                    Connects to your tools and documents. Pulls context from Slack, Jira, research notes, character sheets — so you can focus on the writing, not the gathering.
                                </p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#4A154B]/5 text-[#4A154B] text-xs font-medium">
                                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                                        Slack
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0052CC]/5 text-[#0052CC] text-xs font-medium">
                                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.5V1.005A1.005 1.005 0 0 0 23.013 0z" /></svg>
                                        Jira
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/5 text-amber-700 text-xs font-medium">
                                        Notes
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/5 text-violet-700 text-xs font-medium">
                                        Docs
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex size-12 items-center justify-center rounded-lg bg-[#111318] text-white">
                                    <span className="material-symbols-outlined">edit_document</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#111318]">Track Changes on Every AI Edit</h3>
                                <p className="text-[#616f89] leading-relaxed">
                                    Every AI suggestion appears as a tracked change — accept, reject, or revise. You stay in control of every word, just like Google Docs.
                                </p>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex size-12 items-center justify-center rounded-lg bg-[#111318] text-white">
                                    <span className="material-symbols-outlined">code</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#111318]">Open Source & Transparent</h3>
                                <p className="text-[#616f89] leading-relaxed">
                                    Bring your own API keys. No hidden prompt injection, no vendor lock-in. You own your data and your workflow.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="mx-auto max-w-7xl px-6 py-24 text-center lg:px-10 lg:py-32">
                    <div className="rounded-3xl bg-[#111318] p-12 lg:p-24 overflow-hidden relative">
                        <div
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{
                                backgroundImage: "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
                                backgroundSize: "40px 40px",
                            }}
                        ></div>
                        <div className="relative z-10">
                            <h2 className="serif-headline text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                                Your words. AI-powered workflow.
                            </h2>
                            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">Better context. Better drafts. Full control.</p>
                            <div className="mt-10 w-full max-w-md mx-auto">
                                {submitted ? (
                                    <div className="flex items-center justify-center gap-2 h-14 rounded-lg bg-emerald-50/10 border border-emerald-400/30 text-emerald-300 font-semibold text-sm">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        You&apos;re on the waitlist!
                                    </div>
                                ) : (
                                    <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isSubmitting}
                                            placeholder="you@email.com"
                                            className="flex-1 h-14 px-5 rounded-lg border border-white/20 bg-white/10 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all backdrop-blur-sm shadow-[0_2px_8px_-4px_rgba(0,0,0,0.5)] disabled:opacity-50"
                                        />
                                        <button type="submit" disabled={isSubmitting} className="flex h-14 items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all">
                                            {isSubmitting ? "Joining..." : "Join Waitlist"}
                                        </button>
                                    </form>
                                )}
                                {errorMsg && <p className="mt-2 text-sm text-red-400 text-center font-medium">{errorMsg}</p>}
                                <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-400 font-medium tracking-wide">
                                    <div className="flex -space-x-2">
                                        <div className="size-6 rounded-full border-2 border-[#111318] bg-amber-100 flex items-center justify-center text-[10px] text-amber-700 font-bold">A</div>
                                        <div className="size-6 rounded-full border-2 border-[#111318] bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 font-bold">T</div>
                                        <div className="size-6 rounded-full border-2 border-[#111318] bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold">M</div>
                                    </div>
                                    <span>Join 200+ writers on the waitlist</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#f0f2f4] py-16">
                <div className="mx-auto max-w-7xl px-6 lg:px-10">
                    <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-2xl font-bold">edit_note</span>
                                <h2 className="text-lg font-bold serif-headline">zerodraft.so</h2>
                            </div>
                            <p className="text-sm text-[#616f89]">Open Source. Human-First. Built for Writers.</p>
                        </div>
                    </div>
                    <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[#f0f2f4] pt-8 sm:flex-row">
                        <p className="text-xs text-[#616f89]">© 2024 zerodraft.so. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a className="text-[#616f89] hover:text-primary" href="#">
                                <span className="material-symbols-outlined text-xl">share</span>
                            </a>
                            <a className="text-[#616f89] hover:text-primary" href="#">
                                <span className="material-symbols-outlined text-xl">alternate_email</span>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
