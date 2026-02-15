import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PLAN_LIMITS } from '@/lib/credits';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        // 1. Verify signature
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
        if (!secret) {
            return new NextResponse('Lemon Squeezy Webhook Secret not set in .env', { status: 500 });
        }

        const rawBody = await req.text();
        const signature = req.headers.get('x-signature');

        if (!signature) {
            return new NextResponse('Missing signature', { status: 400 });
        }

        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(rawBody).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
            return new NextResponse('Invalid signature', { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const { meta, data } = payload;
        const eventName = meta.event_name;
        const customData = meta.custom_data || data.attributes.test_mode ? { user_id: 'test_user_id' } : {}; // Fallback for test mode if needed

        // In production, user_id should be in meta.custom_data. 
        // Note: Lemon Squeezy passes custom_data at the root level of meta in some webhooks, 
        // or inside data.attributes.urls for checkout-related ones.
        // For subscription events, it's usually in `meta.custom_data`.
        // Let's check both places or rely on what we send during checkout.
        const userId = meta.custom_data?.user_id;

        if (!userId) {
            // If we can't identify the user, we can't link the subscription.
            // However, we might want to log this.
            console.error('No user_id found in webhook custom_data', payload);
            return new NextResponse('No user_id found', { status: 200 }); // Return 200 to acknowledge receipt
        }

        console.log(`Received event: ${eventName} for user: ${userId}`);

        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated': {
                const attributes = data.attributes;
                const variantId = attributes.variant_id.toString();
                const status = attributes.status;
                const customerId = attributes.customer_id.toString();
                const subscriptionId = data.id.toString();
                const renewsAt = attributes.renews_at;
                const endsAt = attributes.ends_at;

                // Map variant ID to plan
                let plan = 'free';
                if (variantId === process.env.LEMON_SQUEEZY_PRO_VARIANT_ID) plan = 'pro';
                if (variantId === process.env.LEMON_SQUEEZY_ULTRA_VARIANT_ID) plan = 'ultra';

                // Update subscriptions table
                const { error: subError } = await supabase
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        lemon_squeezy_customer_id: customerId,
                        lemon_squeezy_subscription_id: subscriptionId,
                        plan,
                        status,
                        current_period_start: attributes.created_at, // Approximate
                        current_period_end: renewsAt || endsAt,
                        updated_at: new Date().toISOString(),
                    });

                if (subError) throw subError;

                // Update credit usage limit based on plan
                // We only reset credits on 'payment_success', but we update the LIMIT here if they upgrade.
                // If this is a new subscription, we initialize.
                if (eventName === 'subscription_created') {
                    await supabase
                        .from('credit_usage')
                        .upsert({
                            user_id: userId,
                            period_start: new Date().toISOString(), // Use current time as start
                            credits_limit: PLAN_LIMITS[plan] || 50,
                            credits_used: 0
                        }, { onConflict: 'user_id, period_start' }); // This might be tricky with unique constraint on time. 
                    // Actually, simplified logic: just update the latest row? 
                    // Or we can just update the limit on the *current* row if it exists.
                }

                // If upgraded, update the limit of the current usage row?
                // Finding the "current" row is hard without a refined schema.
                // For now, let's just make sure we handle the limit update.
                // We will rely on middleware to check the plan and get the limit from PLAN_LIMITS constant? No, used DB for custom overrides.
                // Let's update the limit in the DB.

                // Get the latest credit_usage row
                const { data: usageData } = await supabase
                    .from('credit_usage')
                    .select('*')
                    .eq('user_id', userId)
                    .order('period_start', { ascending: false })
                    .limit(1)
                    .single();

                if (usageData) {
                    await supabase
                        .from('credit_usage')
                        .update({ credits_limit: PLAN_LIMITS[plan] || 50 })
                        .eq('id', usageData.id);
                }

                break;
            }

            case 'subscription_payment_success': {
                // Reset credits for the new period
                const attributes = data.attributes;
                // verify this is a renewal? usually yes.

                // We need to know the plan to set the correct limit.
                // Fetch subscription first
                const { data: subData } = await supabase
                    .from('subscriptions')
                    .select('plan')
                    .eq('user_id', userId)
                    .single();

                const plan = subData?.plan || 'free';
                const limit = PLAN_LIMITS[plan] || 50;

                // Insert a NEW row for the new period?
                // Or reset the existing one?
                // Designing for "monthly buckets" suggests new rows.
                // Let's insert a new row for the new period.

                await supabase
                    .from('credit_usage')
                    .insert({
                        user_id: userId,
                        period_start: new Date().toISOString(),
                        credits_used: 0,
                        credits_limit: limit
                    });

                break;
            }

            case 'subscription_cancelled': {
                // Update status only. We don't downgrade immediately; they keep access until end of period.
                // The subscription_updated event usually handles the "status: cancelled" update too, but explicit handling is good.
                const attributes = data.attributes;
                const status = attributes.status; // should be 'cancelled'

                await supabase
                    .from('subscriptions')
                    .update({ status: status, updated_at: new Date().toISOString() })
                    .eq('user_id', userId);
                break;
            }
        }

        return new NextResponse('Webhook processed', { status: 200 });

    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return new NextResponse(`Webhook error: ${error.message}`, { status: 500 });
    }
}
