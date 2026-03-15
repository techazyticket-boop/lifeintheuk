// ============================================================
// NETLIFY FUNCTION: cancel-subscription
// Cancels a Stripe subscription at the end of the billing period
// POST /.netlify/functions/cancel-subscription
// Body: { userId }
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
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { userId } = JSON.parse(event.body);
        if (!userId) throw new Error("Missing userId");

        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Database configuration error");

        // Find the active subscription for this user
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('stripe_subscription_id, stripe_customer_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let stripeSubId = sub?.stripe_subscription_id;

        // Fallback: if no stripe_subscription_id in DB, look up from Stripe via customer
        if (!stripeSubId && sub?.stripe_customer_id) {
            const subs = await stripe.subscriptions.list({ customer: sub.stripe_customer_id, status: 'active', limit: 1 });
            stripeSubId = subs.data[0]?.id;
        }

        if (!stripeSubId) {
            throw new Error("No active Stripe subscription found to cancel. Please contact support.");
        }

        // Cancel at the end of the period
        await stripe.subscriptions.update(stripeSubId, {
            cancel_at_period_end: true,
        });

        // Update DB status
        await supabase
            .from('subscriptions')
            .update({ cancel_at_period_end: true })
            .eq('user_id', userId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Your subscription will cancel at the end of the current period.' }),
        };
    } catch (err) {
        console.error('cancel-subscription error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message || 'Failed to cancel subscription' }),
        };
    }
}
