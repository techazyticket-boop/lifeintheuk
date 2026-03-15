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
                .limit(1);

            if (error) {
                console.warn('Failed to load subscription:', error);
            } else if (data && data.length > 0) {
                setSubscription(data[0]);
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

    const isCanceled = subscription?.status === 'canceled' || subscription?.cancel_at_period_end === true;

    const currentPlan = subscription?.plan || null;

    const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end)
        : null;

    const daysRemaining = periodEnd
        ? Math.max(0, Math.ceil((periodEnd - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    // ── Redirect to Stripe Checkout ──────────────────────────
    const startCheckout = async (planId = 'monthly', options = {}) => {
        if (!userId || !userEmail) {
            return { success: false, error: 'You must be logged in to subscribe.' };
        }

        setCheckoutLoading(true);

        try {
            const res = await fetch('/.netlify/functions/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lookup_key: planId, // Using lookup_key from quickstart
                    userId,
                    email: userEmail,
                    successUrl: `${window.location.origin}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
                    cancelUrl: `${window.location.origin}/pricing?status=cancelled`,
                    discountValue: options?.discountValue || null,
                    promoId: options?.promoId || null,
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                let errMessage = 'Checkout failed';
                try {
                    const err = JSON.parse(text);
                    errMessage = err.error || errMessage;
                } catch (e) {
                    console.error('Non-JSON error response from server:', text);
                    errMessage = `Server error (${res.status}): ${text.substring(0, 100)}`;
                }
                throw new Error(errMessage);
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

    // ── Open Stripe Customer Portal ──────────────────────────
    const openCustomerPortal = async () => {
        if (!userId) return { success: false, error: 'User not logged in' };

        setCheckoutLoading(true);
        try {
            const res = await fetch('/.netlify/functions/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Portal failed');
            }

            const { url } = await res.json();

            // Redirect to Stripe Customer Portal
            window.location.href = url;
            return { success: true };
        } catch (err) {
            console.error('Portal error:', err);
            setCheckoutLoading(false);
            return { success: false, error: err.message || 'Failed to open portal' };
        }
    };

    // ── Cancel Subscription ──────────────────────────────────
    const cancelSubscription = async () => {
        if (!userId) return { success: false, error: 'User not logged in' };
        setCheckoutLoading(true);
        try {
            const res = await fetch('/.netlify/functions/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Cancellation failed');
            await loadSubscription();
            return { success: true, message: data.message };
        } catch (err) {
            console.error('Cancel error:', err);
            return { success: false, error: err.message };
        } finally {
            setCheckoutLoading(false);
        }
    };

    // ── Change Plan ───────────────────────────────────────────
    const changePlan = async (newPlanId) => {
        if (!userId) return { success: false, error: 'User not logged in' };
        setCheckoutLoading(true);
        try {
            const res = await fetch('/.netlify/functions/change-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, newPlanId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Plan change failed');
            await loadSubscription();
            return { success: true, message: data.message };
        } catch (err) {
            console.error('Plan change error:', err);
            return { success: false, error: err.message };
        } finally {
            setCheckoutLoading(false);
        }
    };

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
        openCustomerPortal,
        cancelSubscription,
        changePlan,
        refreshSubscription,
        PRICE_IDS,
    };
}
