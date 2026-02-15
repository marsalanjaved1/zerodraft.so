import { SupabaseClient } from '@supabase/supabase-js';

// Credit costs per model (1 turn = Planner + Controller + Writer/Search)
export const CREDIT_MULTIPLIERS: Record<string, number> = {
    // Ultra-Cheap / Economy Tier (1 credit)
    'deepseek/deepseek-chat': 1,
    'meta-llama/llama-3.3-70b-instruct': 1,
    'qwen/qwen3-235b-a22b': 1,
    'minimax/minimax-m2': 1,
    'minimax/minimax-m2.5': 1, // New
    'openai/gpt-4o-mini': 1,
    'google/gemini-flash-1.5': 1,
    'google/gemini-2.0-flash-001': 1, // New

    // Standard Tier (2 credits)
    'deepseek/deepseek-chat-v3.1': 2,
    'moonshotai/kimi-k2': 2,
    'moonshotai/kimi-k2-thinking': 2, // New
    'anthropic/claude-3.5-haiku': 2,
    'google/gemini-pro-1.5': 2,

    // Premium Tier (5 credits)
    'openai/gpt-4o': 5,
    'anthropic/claude-3.5-sonnet': 5,
    'openai/o1-preview': 5,
    'openai/o1-mini': 5,
};

// Plan limits (credits per month)
export const PLAN_LIMITS: Record<string, number> = {
    free: 50,
    pro: 500,
    ultra: 2000,
};

// Models allowed for Free tier (Economy only)
export const FREE_TIER_MODELS = Object.keys(CREDIT_MULTIPLIERS).filter(model => CREDIT_MULTIPLIERS[model] === 1);

export interface Subscription {
    id: string;
    user_id: string;
    plan: 'free' | 'pro' | 'ultra';
    status: 'active' | 'cancelled' | 'past_due' | 'paused';
    current_period_end: string;
}

export interface CreditUsage {
    id: string;
    credits_used: number;
    credits_limit: number;
}

/**
 * Checks if a user has enough credits for a request and if the model is allowed.
 */
export async function checkCredits(
    supabase: SupabaseClient,
    userId: string,
    model: string
): Promise<{ allowed: boolean; error?: string; remaining?: number; cost?: number }> {

    // 1. Get user plan
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .single();

    // Default to free if no subscription found (new users might have delay in webhook)
    const plan = sub?.plan || 'free';

    // 2. Check model restrictions for Free tier
    if (plan === 'free') {
        const isAllowed = FREE_TIER_MODELS.includes(model);
        if (!isAllowed) {
            return {
                allowed: false,
                error: `The Free tier only supports Economy models. Please upgrade to Pro to use ${model}.`
            };
        }
    }

    // 3. Get credit usage
    // We get the *latest* period (assuming current)
    const { data: usage } = await supabase
        .from('credit_usage')
        .select('*')
        .eq('user_id', userId)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

    if (!usage) {
        // If no usage record, create one? Or fail safe?
        // Let's assume 'handle_new_user' created it. If missing, maybe allow?
        // Better to fail closed or create on fly.
        // For now, fail closed but with helpful error.
        console.warn(`No credit usage record found for user ${userId}`);
        return { allowed: false, error: 'Credit account not initialized.' };
    }

    const cost = CREDIT_MULTIPLIERS[model] || 5; // Default to expensive if unknown
    const remaining = usage.credits_limit - usage.credits_used;

    if (remaining < cost) {
        return {
            allowed: false,
            error: `Insufficient credits. This request costs ${cost} credits, but you have ${remaining} left.`,
            remaining
        };
    }

    return { allowed: true, remaining, cost };
}

/**
 * Deducts credits from the user's account and logs the usage.
 */
export async function deductCredits(
    supabase: SupabaseClient,
    userId: string,
    model: string,
    sessionId?: string
): Promise<void> {
    const cost = CREDIT_MULTIPLIERS[model] || 5;

    // 1. Get latest usage record ID
    const { data: usage } = await supabase
        .from('credit_usage')
        .select('id, credits_used')
        .eq('user_id', userId)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

    if (!usage) return;

    // 2. Increment usage
    await supabase.rpc('increment_credits', {
        usage_id: usage.id,
        amount: cost
    });
    // Note: We need to create this RPC function to be atomic!

    // 3. Log usage
    await supabase
        .from('usage_log')
        .insert({
            user_id: userId,
            model,
            credits_charged: cost,
            session_id: sessionId
        });
}
