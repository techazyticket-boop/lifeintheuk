// ============================================================
// NETLIFY FUNCTION: create-portal-session
// Creates a Stripe Billing Portal session for managing subscriptions
// POST /.netlify/functions/create-portal-session
// Body: { customerId, customerEmail } (or fetch from DB)
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
        const { userId } = JSON.parse(event.body);

        if (!userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: userId' }),
            };
        }

        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Database configuration error");

        // Find existing Stripe customer ID from DB
        const { data: subs } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        let customerId = subs && subs.length > 0 ? subs[0].stripe_customer_id : null;

        // Fallback: Search by user email in the users table and then Stripe
        if (!customerId) {
            const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();

            if (userData?.email) {
                const customers = await stripe.customers.list({
                    email: userData.email,
                    limit: 1,
                });
                if (customers.data.length > 0) {
                    customerId = customers.data[0].id;
                }
            }
        }

        if (!customerId) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'No Stripe customer record found. If you just purchased, please wait 30 seconds.' }),
            };
        }

        // Create billing portal session
        const appUrl = process.env.APP_URL || event.headers.origin || 'https://passbrita.com';
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appUrl}/dashboard`,
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                url: portalSession.url,
            }),
        };
    } catch (err) {
        console.error('create-portal-session error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message || 'Failed to create portal session' }),
        };
    }
}
