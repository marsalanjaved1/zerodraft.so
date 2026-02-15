"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

export default function BillingPage() {
    const { plan, remainingCredits, loading: subLoading, subscription } = useSubscription();
    const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

    const handleCheckout = async (variantId: string, planName: string) => {
        setLoadingCheckout(planName);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variantId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to start checkout');
            }
        } catch (err) {
            console.error(err);
            alert('Error starting checkout');
        } finally {
            setLoadingCheckout(null);
        }
    };

    const handlePortal = async () => {
        try {
            const res = await fetch('/api/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to load portal');
            }
        } catch (err) {
            console.error(err);
            alert('Error loading portal');
        }
    };

    if (subLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    const isPro = plan === 'pro';
    const isUltra = plan === 'ultra';

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>

            {/* Current Usage */}
            <div className="bg-white border rounded-xl p-6 mb-8 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-3xl font-bold capitalize">{plan} Plan</div>
                        <div className="text-gray-500">
                            {subscription?.status === 'active' ? 'Active' : 'Updates at end of period'}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{remainingCredits}</div>
                        <div className="text-sm text-gray-500">credits remaining</div>
                    </div>
                </div>

                {/* Progress bar? */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(100, (remainingCredits / (plan === 'ultra' ? 2000 : plan === 'pro' ? 500 : 50)) * 100)}%` }}></div>
                </div>

                {subscription && plan !== 'free' && (
                    <button
                        onClick={handlePortal}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Manage Subscription (Update card, Cancel)
                    </button>
                )}
            </div>

            {/* Upgrade Options */}
            {!isUltra && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Pro Plan */}
                    {(plan === 'free') && (
                        <div className="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-bold mb-2">Pro Plan</h3>
                            <div className="text-2xl font-bold mb-4">$12<span className="text-sm font-normal text-gray-500">/mo</span></div>
                            <ul className="space-y-2 mb-6 text-sm">
                                <li className="flex gap-2"><Check size={16} className="text-green-500" /> 500 Credits</li>
                                <li className="flex gap-2"><Check size={16} className="text-green-500" /> All Models</li>
                                <li className="flex gap-2"><Check size={16} className="text-green-500" /> Web Search</li>
                            </ul>
                            <button
                                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID_PRO_MONTHLY || '', 'Pro')}
                                disabled={!!loadingCheckout}
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loadingCheckout === 'Pro' ? 'Loading...' : 'Upgrade to Pro'}
                            </button>
                        </div>
                    )}

                    {/* Ultra Plan */}
                    <div className="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 ring-indigo-500">
                        <h3 className="text-xl font-bold mb-2">Ultra Plan</h3>
                        <div className="text-2xl font-bold mb-4">$29<span className="text-sm font-normal text-gray-500">/mo</span></div>
                        <ul className="space-y-2 mb-6 text-sm">
                            <li className="flex gap-2"><Check size={16} className="text-green-500" /> 2,000 Credits</li>
                            <li className="flex gap-2"><Check size={16} className="text-green-500" /> Priority Support</li>
                            <li className="flex gap-2"><Check size={16} className="text-green-500" /> Best Value</li>
                        </ul>
                        <button
                            onClick={() => handleCheckout(process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID_ULTRA_MONTHLY || '', 'Ultra')}
                            disabled={!!loadingCheckout}
                            className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                            {loadingCheckout === 'Ultra' ? 'Loading...' : 'Upgrade to Ultra'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
