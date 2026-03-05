// ============================================================
// NETLIFY FUNCTION: create-checkout
// Creates a Stripe Checkout session for subscription purchase
// POST /.netlify/functions/create-checkout
// Body: { priceId, userId, email, successUrl, cancelUrl }
// ============================================================

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function handler(event) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { priceId, userId, email, successUrl, cancelUrl, discountValue, promoId, promoDurationInMonths, promoValidForPlan } = JSON.parse(event.body);

        if (!priceId || !userId || !email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: priceId, userId, email' }),
            };
        }

        // Check if user already has a Stripe customer ID
        const supabase = createSupabaseAdmin();
        let stripeCustomerId = null;

        if (supabase) {
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('stripe_customer_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sub?.stripe_customer_id) {
                stripeCustomerId = sub.stripe_customer_id;
            }
        }

        let stripeCouponId = null;
        if (discountValue) {
            const coupon = await stripe.coupons.create({
                percent_off: discountValue,
                duration: promoDurationInMonths ? 'repeating' : 'forever',
                duration_in_months: promoDurationInMonths ? parseInt(promoDurationInMonths) : undefined,
            });
            stripeCouponId = coupon.id;
        }

        // If no existing customer, let Stripe create one during checkout
        const sessionParams = {
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || `${event.headers.origin || 'https://passbrita.com'}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: cancelUrl || `${event.headers.origin || 'https://passbrita.com'}/pricing?status=cancelled`,
            metadata: {
                supabase_user_id: userId,
            },
            subscription_data: {
                metadata: {
                    supabase_user_id: userId,
                },
            },
            ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : { allow_promotion_codes: true }),
        };

        // If we have an existing customer, reuse it
        if (stripeCustomerId) {
            sessionParams.customer = stripeCustomerId;
        } else {
            sessionParams.customer_email = email;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                url: session.url,
                sessionId: session.id,
            }),
        };
    } catch (err) {
        console.error('create-checkout error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message || 'Failed to create checkout session' }),
        };
    }
}
