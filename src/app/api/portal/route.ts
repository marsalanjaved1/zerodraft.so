import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get customer ID from subscription
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('lemon_squeezy_customer_id')
            .eq('user_id', user.id)
            .single();

        if (!subscription?.lemon_squeezy_customer_id) {
            return NextResponse.json({ error: 'No active billing account found' }, { status: 404 });
        }

        if (!process.env.LEMON_SQUEEZY_API_KEY) {
            return new NextResponse('Lemon Squeezy API key not configured', { status: 500 });
        }

        // Get customer portal URL from Lemon Squeezy
        const response = await fetch(`https://api.lemonsqueezy.com/v1/customers/${subscription.lemon_squeezy_customer_id}`, {
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Lemon Squeezy API Check Failed:', errorText);
            return new NextResponse('Failed to fetch customer data', { status: response.status });
        }

        const data = await response.json();
        const portalUrl = data.data.attributes.urls.customer_portal;

        return NextResponse.json({ url: portalUrl });

    } catch (error: any) {
        console.error('Portal API error:', error);
        return new NextResponse(`Internal error: ${error.message}`, { status: 500 });
    }
}
