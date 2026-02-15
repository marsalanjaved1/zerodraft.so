-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    lemon_squeezy_customer_id TEXT,
    lemon_squeezy_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'ultra'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'paused'
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own subscription" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Service role can manage subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions FOR ALL 
USING (auth.role() = 'service_role');


-- Create credit_usage table
CREATE TABLE IF NOT EXISTS public.credit_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    credits_used INTEGER DEFAULT 0,
    credits_limit INTEGER NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

-- Enable RLS on credit_usage
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own credit usage
CREATE POLICY "Users can view own credit usage" 
ON public.credit_usage FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Service role can manage credit usage
CREATE POLICY "Service role can manage credit usage" 
ON public.credit_usage FOR ALL 
USING (auth.role() = 'service_role');


-- Create usage_log table
CREATE TABLE IF NOT EXISTS public.usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    model TEXT NOT NULL,
    credits_charged INTEGER NOT NULL,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on usage_log
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage logs
CREATE POLICY "Users can view own usage logs" 
ON public.usage_log FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Service role can manage usage logs
CREATE POLICY "Service role can manage usage logs" 
ON public.usage_log FOR ALL 
USING (auth.role() = 'service_role');


-- Function to handle new user creation: automatically create a free subscription and credit usage entry
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Create free subscription
    INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end)
    VALUES (
        NEW.id,
        'free',
        'active',
        NOW(),
        NOW() + INTERVAL '1 month'
    );

    -- Create initial credit usage record
    INSERT INTO public.credit_usage (user_id, period_start, credits_limit)
    VALUES (
        NEW.id,
        NOW(),
        50 -- Free tier limit
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user creation is handled in the existing handle_new_user trigger or can be separate.
-- For safety, let's create a separate trigger if one doesn't exist for this purpose, 
-- but usually it's better to append to the existing profile creation trigger if possible.
-- Checking existing triggers first...
