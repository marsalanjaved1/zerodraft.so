"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AgentAnimation } from "@/components/AgentAnimation";
import { FileText, Shield, Megaphone, PieChart, Scale, Briefcase } from "lucide-react";

const SCENARIOS = [
  { id: 'pm', label: 'Product Manager', icon: Briefcase },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'finance', label: 'Finance', icon: PieChart },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'rfp', label: 'RFP / Security', icon: Shield }
] as const;

export default function Home() {
  const [activeScenario, setActiveScenario] = useState<typeof SCENARIOS[number]['id']>('pm');

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
            <Link
              href="/login"
              className="hidden sm:flex text-sm font-bold text-[#111318] px-4 py-2 hover:bg-[#f0f2f4] rounded-lg transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary/90 transition-all"
            >
              Start Writing
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-10 lg:py-32">
          <div className="mx-auto max-w-4xl flex flex-col items-center">
            <h1 className="serif-headline text-5xl font-semibold leading-[1.1] tracking-tight text-[#111318] sm:text-7xl lg:text-8xl">
              The Agentic AI Editor.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#616f89] sm:text-xl">
              Stop copy-pasting. ZeroDraft is an open-source web workspace where AI agents read, write, and manage your files directly in the browser.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="flex h-14 min-w-[180px] items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all"
              >
                Start Writing Now
              </Link>
              <a
                href="https://github.com/marsalanjaved1/zerodraft.so"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 min-w-[180px] items-center justify-center rounded-lg bg-[#f0f2f4] px-8 text-base font-bold text-[#111318] hover:bg-[#e5e7eb] transition-all gap-2"
              >
                {/* GitHub Icon */}
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          {/* Product Preview */}
          <div className="mt-20 max-w-6xl mx-auto lg:mt-32">
            {/* Scenario Switcher Tabs */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-[#f0f2f4] p-1 rounded-xl border border-[#dbdfe6]">
                {SCENARIOS.map((scenario) => {
                  const Icon = scenario.icon;
                  return (
                    <button
                      key={scenario.id}
                      onClick={() => setActiveScenario(scenario.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ease-out",
                        activeScenario === scenario.id
                          ? "bg-white text-[#111318] shadow-sm ring-1 ring-black/5"
                          : "text-[#616f89] hover:text-[#111318] hover:bg-white/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {scenario.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#dbdfe6] bg-[#fcfcfd] p-2 shadow-2xl">
              <div className="rounded-lg border border-[#dbdfe6] bg-white shadow-inner overflow-hidden">
                <div className="flex items-center gap-2 border-b border-[#dbdfe6] bg-[#f8f9fa] px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="size-3 rounded-full bg-[#ff5f57]"></div>
                    <div className="size-3 rounded-full bg-[#febc2e]"></div>
                    <div className="size-3 rounded-full bg-[#28c840]"></div>
                  </div>
                  <div className="mx-auto text-xs font-medium text-[#616f89]">Untitled Draft — zerodraft.so</div>
                </div>
                {/* Agent Animation Component */}
                <div className="h-[600px] w-full bg-white relative">
                  <AgentAnimation activeScenarioId={activeScenario} />
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
              <p className="mb-6">But then I look at my PMs and Sales teams. They are drowning.</p>
              <p className="mb-6">
                They&apos;re stuck in Microsoft Word, navigating 1,000 open Chrome tabs, frantically searching for information
                buried in folders. When they try to use AI, they have to copy-paste context back and forth, losing hours
                to formatting and friction.
              </p>
              <p className="mb-6 font-bold text-[#111318]">I realized: Why should engineers have all the fun?</p>
              <p className="mb-6">
                I built ZeroDraft to bring that same &apos;Cursor-like&apos; power to writing specs, RFPs, and contracts.
              </p>

              <div className="flex items-center gap-3 mt-8">
                <div className="size-10 rounded-full bg-black/5 overflow-hidden">
                  {/* Small avatar if needed, but we have the big image now */}
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
                  <div className="text-lg font-bold serif-headline">"It's basically Cursor, but for docs."</div>
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -z-10 top-10 -right-10 w-full h-full rounded-2xl border-2 border-dashed border-gray-200"></div>
            </div>
          </div>
        </section>

        {/* Minimal Feature Grid */}
        <section className="bg-[#fcfcfd] border-y border-[#f0f2f4] py-24" id="features">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid gap-12 md:grid-cols-3">
              <div className="flex flex-col gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-[#111318] text-white">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <h3 className="text-xl font-bold text-[#111318]">It’s Agentic</h3>
                <p className="text-[#616f89] leading-relaxed">
                  It doesn&apos;t just chat. It uses tools to list your files, read content, and edit your documents directly.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-[#111318] text-white">
                  <span className="material-symbols-outlined">code</span>
                </div>
                <h3 className="text-xl font-bold text-[#111318]">It’s Open Source</h3>
                <p className="text-[#616f89] leading-relaxed">
                  Transparent code. Bring your own keys. No hidden prompt injection. You are in control.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-[#111318] text-white">
                  <span className="material-symbols-outlined">edit_document</span>
                </div>
                <h3 className="text-xl font-bold text-[#111318]">It’s a Workspace</h3>
                <p className="text-[#616f89] leading-relaxed">
                  Not a chatbot window. A full markdown editor designed for long-form writing, specs, and documentation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-6 py-24 text-center lg:px-10 lg:py-32">
          <div className="rounded-3xl bg-[#111318] p-12 lg:p-24 overflow-hidden relative">
            {/* Subtle background texture */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            ></div>
            <div className="relative z-10">
              <h2 className="serif-headline text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                Ready to work at the speed of thought?
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">Join the open-source revolution.</p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/signup"
                  className="flex h-14 items-center justify-center rounded-lg bg-primary px-10 text-base font-bold text-white shadow-lg hover:shadow-primary/20 transition-all"
                >
                  Start Writing Now
                </Link>
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
              <p className="text-sm text-[#616f89]">Open Source. Web Based. Built for the rest of us.</p>
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
