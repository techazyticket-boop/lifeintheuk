import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Constants ────────────────────────────────────────────────
const AUTH_KEY = 'lifeuk_auth';           // { email: string | null }
const SUBS_KEY = 'lifeuk_subscriptions';  // Set<string> of subscribed emails (stored as array)
const PROMO_CODE = 'avi336';              // Tester promo code

// ─── Context ──────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Current logged-in user
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem(AUTH_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    // OTP state (kept in memory only — never persisted)
    const [pendingOtp, setPendingOtp] = useState(null);
    const [pendingEmail, setPendingEmail] = useState('');

    // Persist user changes
    useEffect(() => {
        if (user) {
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(AUTH_KEY);
        }
    }, [user]);

    // ── Subscription helpers ──────────────────────────────────
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
        // If this is the current user, mark them as premium
        if (user && user.email === email.toLowerCase().trim()) {
            setUser(prev => ({ ...prev, isPremium: true }));
        }
    };

    const hasSubscription = (email) => {
        const subs = getSubscriptions();
        return subs.has(email.toLowerCase().trim());
    };

    // ── OTP flow ──────────────────────────────────────────────
    const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

    /**
     * Step 1: User submits email. Returns the OTP (we display it on screen — simulated delivery).
     */
    const requestOtp = (email) => {
        const otp = generateOtp();
        setPendingEmail(email.toLowerCase().trim());
        setPendingOtp(otp);
        return otp; // caller should display this
    };

    /**
     * Step 2: User submits OTP. Returns { success, isPremium }.
     */
    const verifyOtp = (inputOtp) => {
        if (inputOtp.trim() !== pendingOtp) {
            return { success: false, reason: 'Incorrect code. Please try again.' };
        }
        const email = pendingEmail;
        const isPremium = hasSubscription(email);
        const loggedInUser = { email, isPremium };
        setUser(loggedInUser);
        setPendingOtp(null);
        setPendingEmail('');
        return { success: true, isPremium };
    };

    /**
     * Apply promo code. Returns { success, reason }.
     * Only callable when logged in.
     */
    const applyPromoCode = (code) => {
        if (!user) return { success: false, reason: 'You must be logged in.' };
        if (code.toLowerCase().trim() !== PROMO_CODE) {
            return { success: false, reason: 'Invalid promo code. Please try again.' };
        }
        grantSubscription(user.email);
        return { success: true };
    };

    /**
     * Simulate a successful purchase. Grants subscription and marks user as premium.
     */
    const completePurchase = () => {
        if (!user) return;
        grantSubscription(user.email);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            pendingEmail,
            pendingOtp, // exposed so Pricing can show the OTP code on-screen
            requestOtp,
            verifyOtp,
            applyPromoCode,
            completePurchase,
            grantSubscription,
            hasSubscription,
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
