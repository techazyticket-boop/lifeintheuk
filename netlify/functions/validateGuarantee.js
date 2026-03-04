// ============================================================
// NETLIFY FUNCTION: validateGuarantee
// Server-side guarantee eligibility verification
// POST /api/validateGuarantee
// Body: { userId, examDate }
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { userId, examDate } = JSON.parse(event.body);

        if (!userId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
        }

        const supabase = createSupabaseAdmin();
        if (!supabase) {
            return { statusCode: 503, body: JSON.stringify({ error: 'Service unavailable' }) };
        }

        // 1. Check user exists and is premium
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
        }

        if (!user.is_premium) {
            // Also check subscriptions table for active Stripe subscription
            const { data: activeSub } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('user_id', userId)
                .in('status', ['active', 'trialing'])
                .limit(1)
                .maybeSingle();

            const hasActiveSub = activeSub?.status === 'active' || activeSub?.status === 'trialing';

            if (!hasActiveSub) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        eligible: false,
                        reason: 'Active Premium subscription required.',
                        checks: { hasSubscription: false },
                    }),
                };
            }
        }

        // Check premium hasn't expired (only relevant for users.is_premium path)
        if (user.is_premium && user.premium_end && new Date(user.premium_end) < new Date()) {
            // Double-check via subscriptions table
            const { data: activeSub2 } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('user_id', userId)
                .in('status', ['active', 'trialing'])
                .limit(1)
                .maybeSingle();

            if (!activeSub2) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        eligible: false,
                        reason: 'Premium subscription has expired.',
                        checks: { hasSubscription: false },
                    }),
                };
            }
        }

        // 2. Check guarantee not previously claimed
        if (user.guarantee_claimed) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    eligible: false,
                    reason: 'Guarantee has already been claimed.',
                    checks: { hasSubscription: true, firstAttempt: false },
                }),
            };
        }

        // 3. Count completed mock exams
        const { count: totalMocks } = await supabase
            .from('exam_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (totalMocks < 30) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    eligible: false,
                    reason: `${totalMocks}/30 mock exams completed. Complete all 30 to be eligible.`,
                    checks: {
                        hasSubscription: true,
                        completedMocks: false,
                        mocksCompleted: totalMocks,
                    },
                }),
            };
        }

        // 4. Calculate average of last 5 exam scores
        const { data: recentExams } = await supabase
            .from('exam_attempts')
            .select('score, total_questions')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            .limit(5);

        const avgLastFive = recentExams && recentExams.length >= 5
            ? Math.round(
                recentExams.reduce((sum, e) => sum + (e.score / e.total_questions) * 100, 0) / recentExams.length
            )
            : 0;

        if (avgLastFive < 85) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    eligible: false,
                    reason: `Average score of last 5 mocks is ${avgLastFive}%. Need ≥85%.`,
                    checks: {
                        hasSubscription: true,
                        completedMocks: true,
                        averageMet: false,
                        avgLastFive,
                    },
                }),
            };
        }

        // 5. Check exam date is set
        if (!examDate) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    eligible: false,
                    reason: 'Official exam date must be set before claiming.',
                    checks: {
                        hasSubscription: true,
                        completedMocks: true,
                        averageMet: true,
                        examDateSet: false,
                    },
                }),
            };
        }

        // All checks passed — user is eligible
        // Insert guarantee claim
        const { error: claimError } = await supabase.from('guarantee_claims').insert({
            user_id: userId,
            exam_date: examDate,
            avg_last_five: avgLastFive,
            total_mocks_completed: totalMocks,
            claim_status: 'pending',
        });

        if (claimError) {
            console.error('Guarantee claim insert error:', claimError);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit claim' }) };
        }

        // Mark user as having claimed
        await supabase
            .from('users')
            .update({ guarantee_claimed: true })
            .eq('id', userId);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eligible: true,
                claimSubmitted: true,
                avgLastFive,
                totalMocks,
                message: 'Your guarantee claim has been submitted successfully. We will review it within 48 hours.',
            }),
        };
    } catch (err) {
        console.error('validateGuarantee error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
}
