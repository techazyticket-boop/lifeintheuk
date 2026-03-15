// ============================================================
// NETLIFY FUNCTION: change-plan
// Switches a Stripe subscription to a different price/plan
// POST /.netlify/functions/change-plan
// Body: { userId, newPlanId } // e.g. 'weekly' or 'monthly'
// ============================================================

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Price IDs — use server-side env vars (VITE_ vars are NOT available in Netlify functions)
// Set STRIPE_PRICE_WEEKLY and STRIPE_PRICE_MONTHLY in your Netlify environment variables
// Fallback to lookup keys if direct IDs not set
const PRICE_IDS = {
    weekly: process.env.STRIPE_PRICE_WEEKLY || null,
    monthly: process.env.STRIPE_PRICE_MONTHLY || null,
};

// Lookup keys as fallback (must be set on prices in Stripe Dashboard)
const PLAN_LOOKUP_KEYS = {
    weekly: 'weekly',
    monthly: 'monthly',
};

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
        const { userId, newPlanId } = JSON.parse(event.body);
        if (!userId || !newPlanId) throw new Error("Missing required fields");

        if (!PLAN_LOOKUP_KEYS[newPlanId]) throw new Error(`Invalid plan ID: ${newPlanId}`);

        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Database configuration error");

        // Find the active subscription
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('stripe_subscription_id, stripe_customer_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let stripeSubId = sub?.stripe_subscription_id;

        // Fallback: look up from Stripe directly if not in DB
        if (!stripeSubId && sub?.stripe_customer_id) {
            const subs = await stripe.subscriptions.list({ customer: sub.stripe_customer_id, status: 'active', limit: 1 });
            stripeSubId = subs.data[0]?.id;
        }

        if (!stripeSubId) {
            throw new Error("No active Stripe subscription found to change. Please contact support.");
        }

        // Resolve the new price ID — try direct env var first, then Stripe lookup key
        let newPriceId = PRICE_IDS[newPlanId];
        if (!newPriceId) {
            const prices = await stripe.prices.list({ lookup_keys: [PLAN_LOOKUP_KEYS[newPlanId]], limit: 1 });
            if (!prices.data.length) throw new Error(`No price found for plan: ${newPlanId}. Please set STRIPE_PRICE_WEEKLY / STRIPE_PRICE_MONTHLY env vars.`);
            newPriceId = prices.data[0].id;
        }

        // Retrieve subscription to find the item ID
        const subscription = await stripe.subscriptions.retrieve(stripeSubId);
        const itemId = subscription.items.data[0].id;

        // Update subscription in Stripe
        const updatedSub = await stripe.subscriptions.update(stripeSubId, {
            items: [{ id: itemId, price: newPriceId }],
            proration_behavior: 'always_invoice',
        });

        // Update DB - safe date conversion
        const periodEnd = updatedSub.current_period_end
            ? new Date(updatedSub.current_period_end * 1000).toISOString()
            : null;

        await supabase
            .from('subscriptions')
            .update({
                plan: newPlanId,
                status: updatedSub.status,
                ...(periodEnd ? { current_period_end: periodEnd } : {}),
            })
            .eq('user_id', userId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: `Successfully switched to ${newPlanId} plan.` }),
        };
    } catch (err) {
        console.error('change-plan error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message || 'Failed to change plan' }),
        };
    }
}
