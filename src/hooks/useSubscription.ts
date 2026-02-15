import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Subscription, CreditUsage, PLAN_LIMITS, FREE_TIER_MODELS } from '@/lib/credits';

export function useSubscription() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const [subRes, usageRes] = await Promise.all([
                supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle(),
                supabase
                    .from('credit_usage')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('period_start', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            ]);

            if (subRes.data) setSubscription(subRes.data as Subscription);
            if (usageRes.data) setCreditUsage(usageRes.data as CreditUsage);
        } catch (error) {
            console.error("Failed to fetch subscription data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to check if model is allowed
    const isModelAllowed = (modelId: string) => {
        const plan = subscription?.plan || 'free';
        if (plan === 'free') {
            return FREE_TIER_MODELS.includes(modelId);
        }
        return true;
    };

    // Helper to get remaining credits
    // If no usage record found, we assume full free tier limit (optimistic) or 0 (pessimistic)?
    // Optimistic for UI is better, backend will block if invalid.
    const remainingCredits = creditUsage ? (creditUsage.credits_limit - creditUsage.credits_used) : (PLAN_LIMITS['free']);

    return {
        subscription,
        creditUsage,
        loading,
        plan: subscription?.plan || 'free',
        remainingCredits,
        isModelAllowed,
        refresh: fetchData
    };
}
