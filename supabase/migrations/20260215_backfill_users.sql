-- Backfill subscriptions for existing users
INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end)
SELECT 
    id, 
    'free', 
    'active', 
    NOW(), 
    NOW() + INTERVAL '1 month'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id = u.id
);

-- Backfill credit_usage for existing users
INSERT INTO public.credit_usage (user_id, period_start, credits_limit, credits_used)
SELECT 
    id, 
    NOW(), 
    50, -- Free tier limit
    0
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.credit_usage cu WHERE cu.user_id = u.id
);
