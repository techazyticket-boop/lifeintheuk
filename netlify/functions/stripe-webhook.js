// ============================================================
// NETLIFY FUNCTION: stripe-webhook
// Handles Stripe webhook events to sync subscription state
// POST /.netlify/functions/stripe-webhook
// ============================================================

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Map a Stripe subscription to our DB fields
 */
function mapSubscription(subscription, customerId, userId) {
    const plan = subscription.items?.data?.[0]?.price;
    const planInterval = plan?.recurring?.interval; // 'week' or 'month'
    const planLabel = planInterval === 'month' ? 'monthly' : 'weekly';

    return {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: subscription.status, // 'active', 'canceled', 'past_due', etc.
        plan: planLabel,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
    };
}

/**
 * Upsert subscription record in Supabase
 */
async function upsertSubscription(supabase, subData) {
    // Check if we already have this subscription
    const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subData.stripe_subscription_id)
        .maybeSingle();

    if (existing) {
        // Update existing
        let { error } = await supabase
            .from('subscriptions')
            .update({
                status: subData.status,
                plan: subData.plan,
                current_period_end: subData.current_period_end,
                cancel_at_period_end: subData.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subData.stripe_subscription_id);

        if (error && error.message?.includes('cancel_at_period_end')) {
            const fallbackData = {
                status: subData.status,
                plan: subData.plan,
                current_period_end: subData.current_period_end,
            };
            const retry = await supabase.from('subscriptions').update(fallbackData).eq('stripe_subscription_id', subData.stripe_subscription_id);
            error = retry.error;
        }

        if (error) console.error('Subscription update error:', error);
    } else {
        // Insert new
        let { error } = await supabase
            .from('subscriptions')
            .insert(subData);

        if (error && error.message?.includes('cancel_at_period_end')) {
            const fallbackData = { ...subData };
            delete fallbackData.cancel_at_period_end;
            const retry = await supabase.from('subscriptions').insert(fallbackData);
            error = retry.error;
        }

        if (error) console.error('Subscription insert error:', error);
    }
}

/**
 * Update the users table premium status based on subscription
 */
async function syncUserPremiumStatus(supabase, userId) {
    // Check if user has ANY active subscription
    const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing']);

    const hasActive = activeSubs && activeSubs.length > 0;

    // Find the latest expiry
    const latestEnd = activeSubs?.reduce((latest, sub) => {
        const end = new Date(sub.current_period_end);
        return end > latest ? end : latest;
    }, new Date(0));

    const { error } = await supabase
        .from('users')
        .upsert({
            id: userId,
            is_premium: hasActive,
            premium_start: hasActive ? new Date().toISOString() : null,
            premium_end: hasActive && latestEnd ? latestEnd.toISOString() : null,
        }, { onConflict: 'id' });

    if (error) console.error('User premium sync error:', error);
}

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const supabase = createSupabaseAdmin();
    if (!supabase) {
        console.error('Supabase not configured');
        return { statusCode: 503, body: JSON.stringify({ error: 'Service unavailable' }) };
    }

    // ── Verify webhook signature ──
    let stripeEvent;
    try {
        const sig = event.headers['stripe-signature'];
        if (endpointSecret && sig) {
            stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
        } else {
            // Fallback: parse without verification (dev only)
            stripeEvent = JSON.parse(event.body);
            console.warn('⚠️ Webhook signature not verified — missing secret or signature');
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return { statusCode: 400, body: JSON.stringify({ error: `Webhook Error: ${err.message}` }) };
    }

    const eventType = stripeEvent.type;
    console.log(`[Stripe Webhook] Event: ${eventType}`);

    try {
        switch (eventType) {

            // ── Checkout completed: initial subscription ──
            case 'checkout.session.completed': {
                const session = stripeEvent.data.object;

                if (session.mode === 'subscription') {
                    const userId = session.metadata?.supabase_user_id;
                    const customerId = session.customer;
                    const subscriptionId = session.subscription;

                    if (!userId) {
                        console.error('No supabase_user_id in checkout metadata');
                        break;
                    }

                    // Fetch the full subscription from Stripe
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const subData = mapSubscription(subscription, customerId, userId);
                    await upsertSubscription(supabase, subData);
                    await syncUserPremiumStatus(supabase, userId);

                    console.log(`✅ Subscription created for user ${userId}: ${subscription.id}`);
                }
                break;
            }

            // ── Invoice paid: recurring payment succeeded ──
            case 'invoice.paid': {
                const invoice = stripeEvent.data.object;
                const subscriptionId = invoice.subscription;

                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const userId = subscription.metadata?.supabase_user_id;

                    if (userId) {
                        const subData = mapSubscription(subscription, invoice.customer, userId);
                        await upsertSubscription(supabase, subData);
                        await syncUserPremiumStatus(supabase, userId);
                        console.log(`✅ Invoice paid → subscription renewed for user ${userId}`);
                    }
                }
                break;
            }

            // ── Subscription updated (plan change, pause, etc) ──
            case 'customer.subscription.updated': {
                const subscription = stripeEvent.data.object;
                const userId = subscription.metadata?.supabase_user_id;

                if (userId) {
                    const subData = mapSubscription(subscription, subscription.customer, userId);
                    await upsertSubscription(supabase, subData);
                    await syncUserPremiumStatus(supabase, userId);
                    console.log(`✅ Subscription updated for user ${userId}: status=${subscription.status}`);
                }
                break;
            }

            // ── Subscription deleted (cancelled) ──
            case 'customer.subscription.deleted': {
                const subscription = stripeEvent.data.object;
                const userId = subscription.metadata?.supabase_user_id;

                if (userId) {
                    const subData = mapSubscription(subscription, subscription.customer, userId);
                    subData.status = 'canceled';
                    await upsertSubscription(supabase, subData);
                    await syncUserPremiumStatus(supabase, userId);
                    console.log(`✅ Subscription canceled for user ${userId}`);
                }
                break;
            }

            // ── Payment failed ──
            case 'invoice.payment_failed': {
                const invoice = stripeEvent.data.object;
                const subscriptionId = invoice.subscription;

                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const userId = subscription.metadata?.supabase_user_id;

                    if (userId) {
                        const subData = mapSubscription(subscription, invoice.customer, userId);
                        await upsertSubscription(supabase, subData);
                        await syncUserPremiumStatus(supabase, userId);
                        console.log(`⚠️ Payment failed for user ${userId}`);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true }),
        };
    } catch (err) {
        console.error('Webhook handler error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook handler failed' }),
        };
    }
}
