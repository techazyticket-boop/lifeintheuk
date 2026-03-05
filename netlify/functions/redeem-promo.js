// ============================================================
// NETLIFY FUNCTION: redeem-promo
// Validates promo code and applies either full access or discount
// POST /.netlify/functions/redeem-promo
// Body: { code, userId }
// ============================================================

import { createClient } from '@supabase/supabase-js';

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

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { code, userId } = JSON.parse(event.body);
        if (!code || !userId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing code or user' }) };
        }

        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error('Supabase admin client not configured');

        // 1. Fetch code
        const { data: promo, error: promoError } = await supabase
            .from('promo_codes')
            .select('*')
            .ilike('code', code.trim())
            .maybeSingle();

        if (promoError || !promo) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid or expired promo code.' }) };
        }

        // 2. Validate code
        if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Promo code is expired.' }) };
        }
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Promo code usage limit reached.' }) };
        }

        // 3. User already redeemed?
        const { data: redemptions } = await supabase
            .from('promo_redemptions')
            .select('id')
            .eq('user_id', userId)
            .eq('promo_id', promo.id);

        if (redemptions && redemptions.length > 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You have already redeemed this promo code.' }) };
        }

        // 4. If full access -> automatically provision
        if (promo.type === 'full') {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30); // grant 30 days

            const { error: subError } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    status: 'active',
                    plan: 'promo_full_access',
                    current_period_end: endDate.toISOString(),
                });

            if (subError) throw new Error('Failed to provision access: ' + subError.message);

            // Increment usage
            await supabase
                .from('promo_codes')
                .update({ current_uses: (promo.current_uses || 0) + 1 })
                .eq('id', promo.id);

            // Add redemption record
            await supabase
                .from('promo_redemptions')
                .insert({ promo_id: promo.id, user_id: userId });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, type: 'full', message: 'Full premium access granted!' }),
            };
        }

        // 5. If percentage discount -> Return promo details for checkout override
        if (promo.type === 'percentage') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    type: 'percentage',
                    value: promo.value,
                    promoId: promo.id,
                    validForPlan: promo.valid_for_plan || null,
                    durationInMonths: promo.duration_in_months || null,
                    message: `${promo.value}% discount applied!`
                }),
            };
        }

    } catch (err) {
        console.error('redeem-promo error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message || 'Server error applying promo code' }),
        };
    }
}
