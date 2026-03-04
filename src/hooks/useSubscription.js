// ============================================================
// useSubscription — Manages Stripe subscription state
// Checks Supabase for active subscription, handles checkout
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase, isMockMode } from '../lib/supabase';

// Stripe price IDs — set these in your .env file
const PRICE_IDS = {
    weekly: import.meta.env.VITE_STRIPE_PRICE_WEEKLY || '',
    monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '',
};

export function useSubscription(userId, userEmail) {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // ── Load subscription from Supabase ──────────────────────
    const loadSubscription = useCallback(async () => {
        if (isMockMode || !supabase || !userId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.warn('Failed to load subscription:', error);
            } else if (data) {
                setSubscription(data);
            }
        } catch (err) {
            console.warn('Subscription load error:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadSubscription();
    }, [loadSubscription]);

    // ── Derived state ────────────────────────────────────────
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

    const isPastDue = subscription?.status === 'past_due';

    const isCanceled = subscription?.status === 'canceled';

    const currentPlan = subscription?.plan || null;

    const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end)
        : null;

    const daysRemaining = periodEnd
        ? Math.max(0, Math.ceil((periodEnd - new Date()) / (1000 * 60 * 60 * 24)))
        : null;

    // ── Redirect to Stripe Checkout ──────────────────────────
    const startCheckout = async (planId = 'monthly', options = {}) => {
        const priceId = PRICE_IDS[planId];

        if (!priceId) {
            console.error(`No Stripe price ID configured for plan: ${planId}`);
            return { success: false, error: 'Payment system not configured. Please try again later.' };
        }

        if (!userId || !userEmail) {
            return { success: false, error: 'You must be logged in to subscribe.' };
        }

        setCheckoutLoading(true);

        try {
            const res = await fetch('/.netlify/functions/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    userId,
                    email: userEmail,
                    successUrl: `${window.location.origin}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
                    cancelUrl: `${window.location.origin}/pricing?status=cancelled`,
                    discountValue: options?.discountValue || null,
                    promoId: options?.promoId || null,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Checkout failed');
            }

            const { url } = await res.json();

            // Redirect to Stripe Checkout
            window.location.href = url;

            return { success: true };
        } catch (err) {
            console.error('Checkout error:', err);
            setCheckoutLoading(false);
            return { success: false, error: err.message || 'Failed to start checkout' };
        }
    };

    // ── Refresh subscription after returning from checkout ────
    const refreshSubscription = useCallback(async () => {
        setLoading(true);
        // Small delay to let webhook process
        await new Promise(r => setTimeout(r, 2000));
        await loadSubscription();
    }, [loadSubscription]);

    return {
        subscription,
        loading,
        checkoutLoading,
        isActive,
        isPastDue,
        isCanceled,
        currentPlan,
        periodEnd,
        daysRemaining,
        startCheckout,
        refreshSubscription,
        PRICE_IDS,
    };
}
