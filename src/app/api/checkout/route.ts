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

        const { variantId, redirectUrl } = await req.json();

        if (!variantId) {
            return new NextResponse('Missing variantId', { status: 400 });
        }

        if (!process.env.LEMON_SQUEEZY_API_KEY || !process.env.LEMON_SQUEEZY_STORE_ID) {
            return new NextResponse('Lemon Squeezy not configured', { status: 500 });
        }

        const payload = {
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        custom: {
                            user_id: user.id,
                        },
                    },
                    product_options: {
                        redirect_url: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
                    },
                },
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: process.env.LEMON_SQUEEZY_STORE_ID,
                        },
                    },
                    variant: {
                        data: {
                            type: 'variants',
                            id: variantId.toString(),
                        },
                    },
                },
            },
        };

        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json',
                'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Lemon Squeezy API error:', data);
            return new NextResponse(`Lemon Squeezy error: ${JSON.stringify(data.errors)}`, { status: response.status });
        }

        const checkoutUrl = data.data.attributes.url;

        return NextResponse.json({ url: checkoutUrl });

    } catch (error: any) {
        console.error('Checkout creation error:', error);
        return new NextResponse(`Internal error: ${error.message}`, { status: 500 });
    }
}
