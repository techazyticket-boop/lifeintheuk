import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isMockMode } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────
const AUTH_KEY = 'lifeuk_auth';
const SUBS_KEY = 'lifeuk_subscriptions';
const PROMO_CODE = 'avi336';

// ─── Context ──────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pendingEmail, setPendingEmail] = useState('');

    // ── Initialize auth state ────────────────────────────────
    useEffect(() => {
        if (isMockMode) {
            // Fallback: localStorage-based auth for local dev
            try {
                const stored = localStorage.getItem(AUTH_KEY);
                if (stored) setUser(JSON.parse(stored));
            } catch { }
            setLoading(false);
            return;
        }

        // Supabase: check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email,
                    isPremium: false, // will be enriched below
                });
                enrichUserProfile(session.user.id, session.user.email);
            }
            setLoading(false);
        });

        // Listen for auth changes (magic link redirect, logout, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email,
                        isPremium: false,
                    });
                    enrichUserProfile(session.user.id, session.user.email);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // ── Enrich user with premium status from DB ──────────────
    // Now checks BOTH users.is_premium AND subscriptions table
    async function enrichUserProfile(userId, email) {
        if (isMockMode) return;
        try {
            // Check users table
            const { data: userData } = await supabase
                .from('users')
                .select('is_premium, premium_start, premium_end, guarantee_claimed')
                .eq('id', userId)
                .single();

            // Check subscriptions table for active subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('status, plan, current_period_end')
                .eq('user_id', userId)
                .in('status', ['active', 'trialing'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const hasActiveSubscription = subData?.status === 'active' || subData?.status === 'trialing';
            const isUserPremium = userData?.is_premium &&
                (!userData.premium_end || new Date(userData.premium_end) > new Date());

            const isPremium = hasActiveSubscription || isUserPremium;

            setUser(prev => prev ? {
                ...prev,
                isPremium,
                guaranteeClaimed: userData?.guarantee_claimed || false,
                subscriptionPlan: subData?.plan || null,
                subscriptionStatus: subData?.status || null,
                subscriptionPeriodEnd: subData?.current_period_end || null,
            } : prev);
        } catch (err) {
            console.warn('Failed to enrich user profile:', err);
        }
    }

    // ── Persist mock-mode user ───────────────────────────────
    useEffect(() => {
        if (!isMockMode) return;
        if (user) {
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(AUTH_KEY);
        }
    }, [user]);

    // ── Subscription helpers (localStorage fallback for mock mode) ──
    const getSubscriptions = () => {
        try {
            const raw = localStorage.getItem(SUBS_KEY);
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    };

    const grantSubscription = (email) => {
        const subs = getSubscriptions();
        subs.add(email.toLowerCase().trim());
        localStorage.setItem(SUBS_KEY, JSON.stringify([...subs]));
        if (user && user.email === email.toLowerCase().trim()) {
            setUser(prev => ({ ...prev, isPremium: true }));
        }
    };

    const hasSubscription = (email) => {
        if (user?.isPremium && user?.email === email.toLowerCase().trim()) return true;
        const subs = getSubscriptions();
        return subs.has(email.toLowerCase().trim());
    };

    // ── Refresh premium status (call after Stripe checkout return) ──
    const refreshPremiumStatus = async () => {
        if (!user?.id || isMockMode) return;
        await enrichUserProfile(user.id, user.email);
    };

    // ── OTP Login via Supabase ───────────────────────────────
    const requestOtp = async (email) => {
        const normalizedEmail = email.toLowerCase().trim();
        setPendingEmail(normalizedEmail);

        if (isMockMode) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            return { success: true, message: 'OTP sent', otp, mockMode: true };
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true,
                },
            });

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true, message: 'Check your email for a login link.' };
        } catch (err) {
            return { success: false, message: 'Failed to send login email. Please try again.' };
        }
    };

    const verifyOtp = async (inputOtp, opts = {}) => {
        if (isMockMode) {
            const email = opts.email || pendingEmail;
            const isPremium = hasSubscription(email);
            const loggedInUser = { email, isPremium, id: 'mock-' + Date.now() };
            setUser(loggedInUser);
            setPendingEmail('');
            return { success: true, isPremium };
        }

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: opts.email || pendingEmail,
                token: inputOtp,
                type: 'email',
            });

            if (error) {
                return { success: false, reason: error.message };
            }

            if (data?.user) {
                setUser({
                    id: data.user.id,
                    email: data.user.email,
                    isPremium: false,
                });
                await enrichUserProfile(data.user.id, data.user.email);
                return { success: true, isPremium: false };
            }

            return { success: false, reason: 'Verification failed.' };
        } catch (err) {
            return { success: false, reason: 'Verification failed. Please try again.' };
        }
    };

    const applyPromoCode = async (code) => {
        if (!user) return { success: false, reason: 'You must be logged in.' };

        if (isMockMode) {
            if (code.toLowerCase().trim() !== PROMO_CODE) {
                return { success: false, reason: 'Invalid promo code. Please try again.' };
            }
            grantSubscription(user.email);
            return { success: true, type: 'full' };
        }

        try {
            const res = await fetch('/.netlify/functions/redeem-promo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, userId: user.id }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, reason: data.error || 'Invalid promo code.' };
            }

            if (data.type === 'full') {
                await refreshPremiumStatus();
            }

            return { success: true, type: data.type, value: data.value, promoId: data.promoId };
        } catch (err) {
            return { success: false, reason: 'Failed to verify promo code.' };
        }
    };

    // ── Purchase (mock mode only — real purchases go through Stripe) ──
    const completePurchase = () => {
        if (!user) return;
        grantSubscription(user.email);
    };

    // ── Logout ───────────────────────────────────────────────
    const logout = async () => {
        if (!isMockMode && supabase) {
            await supabase.auth.signOut();
        }
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            pendingEmail,
            isMockMode,
            requestOtp,
            verifyOtp,
            applyPromoCode,
            completePurchase,
            grantSubscription,
            hasSubscription,
            refreshPremiumStatus,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
