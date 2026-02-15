"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface PricingSectionProps {
    user: User | null;
}

export function PricingSection({ user }: PricingSectionProps) {
    const [isAnnual, setIsAnnual] = useState(true);

    const plans = [
        {
            name: "Free",
            price: "$0",
            period: "/mo",
            description: "For hobbyists and casual experimenters.",
            features: [
                "50 credits / month",
                "Access to Economy models (LLaMA 3, DeepSeek)",
                "1 workspace",
                "5 documents per workspace",
            ],
            notIncluded: [
                "Premium models (GPT-4o, Claude 3.5)",
                "Web search & research tools",
                "Document export (DOCX, Markdown)",
                "Priority support"
            ],
            cta: user ? "Current Plan" : "Get Started Free",
            href: user ? "/dashboard" : "/signup",
            popular: false,
        },
        {
            name: "Pro",
            price: isAnnual ? "$9" : "$12",
            period: "/mo",
            billing: isAnnual ? "billed annually" : "billed monthly",
            description: "For serious writers and content creators.",
            features: [
                "500 credits / month",
                "Access to ALL models",
                "Web search & research agent",
                "Up to 5 workspaces",
                "Unlimited documents",
                "Export to DOCX & Markdown",
            ],
            cta: "Upgrade to Pro",
            href: user ? "/settings/billing" : "/signup",
            popular: true,
            highlight: "Most Popular",
        },
        {
            name: "Ultra",
            price: isAnnual ? "$22" : "$29",
            period: "/mo",
            billing: isAnnual ? "billed annually" : "billed monthly",
            description: "For power users and agencies.",
            features: [
                "2,000 credits / month",
                "Access to ALL models",
                "Web search & research agent",
                "Unlimited workspaces",
                "Unlimited documents",
                "Priority email support",
                "Early access to new features",
            ],
            cta: "Go Ultra",
            href: user ? "/settings/billing" : "/signup",
            popular: false,
        },
    ];

    return (
        <section className="py-24 bg-white" id="pricing">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-indigo-600">Pricing</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl serif-headline">
                        Pricing that scales with your writing.
                    </p>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
                    Choose the plan that fits your workflow. Cancel anytime.
                </p>

                {/* Toggle */}
                <div className="mt-16 flex justify-center">
                    <div className="relative flex rounded-full bg-gray-100 p-1">
                        <button
                            type="button"
                            className={`${!isAnnual ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'} relative rounded-full px-6 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
                            onClick={() => setIsAnnual(false)}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            className={`${isAnnual ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'} relative ml-0.5 rounded-full px-6 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
                            onClick={() => setIsAnnual(true)}
                        >
                            Annual
                            <span className="absolute -top-3 -right-6 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                -25%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Cards */}
                <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`rounded-3xl p-8 ring-1 xl:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${plan.popular
                                ? 'bg-gray-900 ring-gray-900 shadow-2xl scale-105 lg:scale-110 z-10'
                                : 'bg-white ring-gray-200'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-x-4">
                                <h3
                                    id={plan.name}
                                    className={`text-lg font-semibold leading-8 ${plan.popular ? 'text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {plan.name}
                                </h3>
                                {plan.popular && (
                                    <span className="rounded-full bg-indigo-500 px-2.5 py-1 text-xs font-bold leading-5 text-white shadow-sm">
                                        {plan.highlight}
                                    </span>
                                )}
                            </div>
                            <p className={`mt-4 text-sm leading-6 ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                                {plan.description}
                            </p>
                            <p className="mt-6 flex items-baseline gap-x-1">
                                <span className={`text-4xl font-bold tracking-tight ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                                    {plan.price}
                                </span>
                                <span className={`text-sm font-semibold leading-6 ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {plan.period}
                                </span>
                            </p>
                            {plan.billing && (
                                <p className={`mt-1 text-xs leading-5 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {plan.billing}
                                </p>
                            )}
                            <Link
                                href={plan.href}
                                aria-describedby={plan.name}
                                className={`mt-6 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 shadow-sm ${plan.popular
                                    ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-500' // Changed Free CTA to blue too for consistency, or keep standard
                                    } ${plan.name === 'Free' && user ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 ring-1 ring-inset ring-gray-200' : ''}`} // Styling hack for disabled-looking button if already on free plan?
                            >
                                {plan.cta}
                            </Link>
                            <ul
                                role="list"
                                className={`mt-8 space-y-3 text-sm leading-6 ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}
                            >
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <Check className={`h-6 w-5 flex-none ${plan.popular ? 'text-indigo-400' : 'text-indigo-600'}`} aria-hidden="true" />
                                        {feature}
                                    </li>
                                ))}
                                {plan.notIncluded?.map((feature) => (
                                    <li key={feature} className="flex gap-x-3 opacity-50">
                                        <X className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
