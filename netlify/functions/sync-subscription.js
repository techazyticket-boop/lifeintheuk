import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function handler(event) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

    try {
        const { sessionId, userId: fallbackUserId } = JSON.parse(event.body);
        if (!sessionId) throw new Error('Missing sessionId');

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') throw new Error('Not paid');

        // Extract userId from Stripe metadata, fallback to body if missing
        const userId = session.metadata?.supabase_user_id || fallbackUserId;
        if (!userId) throw new Error('Missing userId in session metadata');

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;

        const plan = subscription.items?.data?.[0]?.price;
        const planInterval = plan?.recurring?.interval;
        const planLabel = planInterval === 'month' ? 'monthly' : 'weekly';

        const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Base data that always exists in the subscriptions table
        const subData = {
            user_id: userId,
            status: subscription.status,
            plan: planLabel,
            current_period_end: periodEnd,
        };

        // Add Stripe IDs if the columns exist (may not exist in older DB schemas)
        const subDataWithStripe = {
            ...subData,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
        };

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Sync Users table FIRST (using upsert in case auth trigger failed)
        // This ensures the row exists before we try to add a subscription that links to it.
        const { error: userError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: session.customer_details?.email || session.customer_email || null,
                is_premium: true,
                premium_start: new Date().toISOString(),
                premium_end: subData.current_period_end
            }, { onConflict: 'id' });

        if (userError) throw userError;

        // Check if subscription already exists by stripe_subscription_id
        let existingById = null;
        if (subscription.id) {
            const { data } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('stripe_subscription_id', subscription.id)
                .maybeSingle();
            existingById = data;
        }

        if (existingById) {
            // Update - try with stripe columns first, fall back without
            let { error } = await supabase
                .from('subscriptions')
                .update(subDataWithStripe)
                .eq('stripe_subscription_id', subscription.id);

            if (error) {
                // Fall back to just base columns
                const { error: fallbackErr } = await supabase
                    .from('subscriptions')
                    .update(subData)
                    .eq('stripe_subscription_id', subscription.id);
                if (fallbackErr) throw fallbackErr;
            }
        } else {
            // Insert - try with stripe columns first, fall back without
            let { error } = await supabase
                .from('subscriptions')
                .insert(subDataWithStripe);

            if (error) {
                // Fall back to base columns only
                const { error: fallbackErr } = await supabase
                    .from('subscriptions')
                    .insert(subData);
                if (fallbackErr) throw fallbackErr;
            }
        }

        console.log(`[sync-subscription] Success for user ${userId}`);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
        console.error('[sync-subscription] Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
}
