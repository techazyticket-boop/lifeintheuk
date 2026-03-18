import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../hooks/useProgress';
import { useSubscription } from '../hooks/useSubscription';
import {
    ShieldCheck, Check, LockOpen, Star, Mail,
    KeyRound, Tag, Loader2, ArrowRight, LogIn, Gift, Zap, Calendar,
    CreditCard, ExternalLink, AlertCircle
} from 'lucide-react';

// ── Plans ─────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'weekly',
        label: 'Weekly',
        price: '£3.99',
        period: 'week',
        badge: null,
        description: 'Pay as you go — cancel anytime',
        billingNote: 'Billed £3.99 every 7 days until cancelled',
    },
    {
        id: 'monthly',
        label: 'Monthly',
        price: '£9.99',
        period: 'month',
        badge: 'BEST VALUE',
        description: 'Most popular — save vs. weekly',
        billingNote: 'Billed £9.99 every 30 days until cancelled',
    },
];

// ── Step indicator ────────────────────────────────────────────
function StepDot({ n, active, done }) {
    return (
        <div style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.85rem',
            background: done ? 'var(--success)' : active ? 'var(--accent-primary)' : 'var(--bg-card)',
            border: `2px solid ${done ? 'var(--success)' : active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            color: done || active ? 'white' : 'var(--text-muted)',
            transition: 'all 0.3s ease',
        }}>
            {done ? <Check size={14} /> : n}
        </div>
    );
}

function StepBar({ step }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 'var(--space-xl)' }}>
            <StepDot n={1} active={step === 1} done={step > 1} />
            <div style={{ width: 60, height: 2, background: step > 1 ? 'var(--success)' : 'var(--border-color)', transition: 'all 0.3s ease' }} />
            <StepDot n={2} active={step === 2} done={step > 2} />
            <div style={{ width: 60, height: 2, background: step > 2 ? 'var(--success)' : 'var(--border-color)', transition: 'all 0.3s ease' }} />
            <StepDot n={3} active={step === 3} done={step > 3} />
        </div>
    );
}

// ── Input field ───────────────────────────────────────────────
function InputField({ icon: Icon, placeholder, value, onChange, type = 'text', error }) {
    return (
        <div style={{ marginBottom: error ? 'var(--space-xs)' : 'var(--space-md)' }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? 'var(--danger)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-sm) var(--space-md)',
                transition: 'border-color 0.2s',
            }}>
                <Icon size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    style={{
                        background: 'transparent', border: 'none', outline: 'none',
                        color: 'white', fontSize: '1rem', width: '100%',
                        fontFamily: 'inherit',
                    }}
                />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 4 }}>{error}</p>}
        </div>
    );
}

// ── Plan Card ─────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
    const isSelected = selected === plan.id;
    return (
        <button
            onClick={() => onSelect(plan.id)}
            style={{
                flex: 1, position: 'relative', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)',
                border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                color: 'var(--text-primary)', fontFamily: 'inherit',
            }}
        >
            {plan.badge && (
                <span style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                    color: 'white', fontSize: '0.65rem', fontWeight: 800,
                    padding: '2px 10px', borderRadius: 999, letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                    {plan.badge}
                </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{plan.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {plan.id === 'weekly' ? <Zap size={14} /> : <Calendar size={14} />}
                </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: 4 }}>
                {plan.price}
                <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>/{plan.period}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{plan.description}</div>
        </button>
    );
}

export default function Pricing() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, requestOtp, verifyOtp, applyPromoCode, completePurchase, logout, isMockMode, refreshPremiumStatus } = useAuth();
    const { progress, unlockPremium } = useProgress();

    // Stripe subscription hook
    const {
        isActive: hasStripeSubscription,
        checkoutLoading,
        startCheckout,
        refreshSubscription,
        currentPlan: stripePlan,
        periodEnd,
        daysRemaining,
        openCustomerPortal,
    } = useSubscription(user?.id, user?.email);

    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const plan = PLANS.find(p => p.id === selectedPlan);

    // step 1 = email, step 2 = OTP, step 3 = subscribe/promo, step 4 = success
    const [step, setStep] = useState(() => {
        if (user && (user.isPremium || hasStripeSubscription)) return 4;
        if (user) return 3;
        return 1;
    });

    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [displayedOtp, setDisplayedOtp] = useState(null);
    const [checkoutError, setCheckoutError] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);

    // ── Handle Stripe checkout return ─────────────────────────
    const { loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) return; // Wait for user to be fully loaded before consuming the URL parameter!

        const status = searchParams.get('status');
        const sessionId = searchParams.get('session_id');

        if (status === 'success' && sessionId) {
            // User returned from Stripe
            setStep(4);

            const finalize = () => {
                unlockPremium();
                navigate('/pricing', { replace: true });
            };

            // Sync with backend immediately
            if (user && user.id) {
                setLoading(true);
                fetch('/.netlify/functions/sync-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, userId: user.id }),
                }).then(async (res) => {
                    const data = await res.json();
                    if (data.success) {
                        await refreshSubscription();
                        if (refreshPremiumStatus) await refreshPremiumStatus();
                        finalize();
                    } else {
                        console.error('Sync failed:', data.error);
                        refreshSubscription();
                        setCheckoutError('Payment not completed or status pending. Please try again.');
                        setStep(3);
                        navigate('/pricing', { replace: true });
                    }
                }).catch(err => {
                    console.error('Sync error:', err);
                    refreshSubscription();
                    setCheckoutError('Could not verify payment status.');
                    setStep(3);
                    navigate('/pricing', { replace: true });
                }).finally(() => {
                    setLoading(false);
                });
            } else {
                refreshSubscription();
                if (refreshPremiumStatus) refreshPremiumStatus();
                // Safety catch: don't blindly unlock if no user exists
                setStep(1);
                navigate('/pricing', { replace: true });
            }
        } else if (status === 'cancelled') {
            setStep(user ? 3 : 1);
            navigate('/pricing', { replace: true });
        }
    }, [searchParams, authLoading, user, refreshSubscription, refreshPremiumStatus, unlockPremium, navigate]);

    // ── Sync step when user state changes ─────────────────────
    useEffect(() => {
        if (user && (user.isPremium || hasStripeSubscription)) {
            setStep(4);
        } else if (user && step < 3) {
            setStep(3);
        }
    }, [user, hasStripeSubscription]);

    // ── Validate Promo vs Selected Plan ───────────────────────
    useEffect(() => {
        if (appliedPromo && appliedPromo.validForPlan && appliedPromo.validForPlan !== selectedPlan) {
            setAppliedPromo(null);
            setPromoSuccess(false);
            setPromoError(`Promo code removed. It is only valid for the ${appliedPromo.validForPlan} plan.`);
            setPromoCode('');
        }
    }, [selectedPlan, appliedPromo]);

    // Loading state for checkout sync
    if (loading && searchParams.get('session_id')) {
        return (
            <div className="container slide-up" style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', maxWidth: 500, margin: '0 auto' }}>
                <Loader2 size={48} className="spin" color="var(--accent-primary)" style={{ margin: '0 auto var(--space-xl)' }} />
                <h1 style={{ marginBottom: 'var(--space-sm)' }}>Finalizing Membership...</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                    We're confirming your payment with Stripe. This usually takes just 2-3 seconds.
                </p>
            </div>
        );
    }

    // Already premium
    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'techazyticket@gmail.com';
    const isAdmin = user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isPremiumStatus = (user && (progress.isPremium || user.isPremium)) || hasStripeSubscription || isAdmin;
    const isMock = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://your-project.supabase.co';
    const canManageStripe = isPremiumStatus && !isMock;

    if (isPremiumStatus) {
        return (
            <div className="container slide-up" style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', maxWidth: 500, margin: '0 auto' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)' }}>
                    <ShieldCheck size={40} color="var(--success)" />
                </div>
                <h1 style={{ marginBottom: 'var(--space-sm)' }}>You Have Premium Access!</h1>
                {user && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>Logged in as <strong style={{ color: 'var(--text-secondary)' }}>{user.email}</strong></p>}
                {stripePlan && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
                        Plan: <strong style={{ color: 'var(--accent-primary)', textTransform: 'capitalize' }}>{stripePlan}</strong>
                        {daysRemaining !== null && ` · Renews in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
                    </p>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: 'var(--space-xl)' }}>
                    Full access to all 30 mock exams, the study handbook and the pass guarantee.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
                    {canManageStripe && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/membership')}
                        >
                            Manage Subscription
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const handleEmailSubmit = async () => {
        const trimmed = email.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        setEmailError('');
        setLoading(true);
        const result = await requestOtp(trimmed);
        setLoading(false);
        if (!result.success) {
            setEmailError(result.message || 'Failed to send login email.');
            return;
        }
        if (result.mockMode) {
            setDisplayedOtp(result.otp);
        } else {
            setDisplayedOtp(null);
        }
        setStep(2);
    };

    const handleOtpSubmit = async () => {
        if (otp.trim().length !== 6) { setOtpError('Enter the 6-digit code.'); return; }
        setOtpError('');
        setLoading(true);
        const result = await verifyOtp(otp.trim(), { email: email.trim() });
        setLoading(false);
        if (!result.success) { setOtpError(result.reason || 'Incorrect code.'); return; }
        if (result.isPremium) { unlockPremium(); setStep(4); } else { setStep(3); }
    };

    // Step 3a: Promo
    const handlePromoSubmit = async () => {
        setPromoError('');
        setLoading(true);
        const result = await applyPromoCode(promoCode);
        setLoading(false);
        if (!result.success) { setPromoError(result.reason || 'Invalid promo code.'); return; }

        if (result.type === 'full') {
            unlockPremium();
            setPromoSuccess(true);
            setTimeout(() => setStep(4), 1200);
        } else if (result.type === 'percentage') {
            if (result.validForPlan && result.validForPlan !== selectedPlan) {
                setPromoError(`This promo code is only valid for the ${result.validForPlan} plan.`);
                return;
            }

            setAppliedPromo({
                promoId: result.promoId,
                value: result.value,
                validForPlan: result.validForPlan,
                durationInMonths: result.durationInMonths,
                message: result.message
            });
            setPromoSuccess(true);
        }
    };

    // Step 3b: Stripe Checkout
    const handleStripeCheckout = async () => {
        setCheckoutError('');

        if (isMockMode) {
            // Mock mode: simulate payment
            setLoading(true);
            setTimeout(() => {
                completePurchase();
                unlockPremium();
                setLoading(false);
                setStep(4);
            }, 1800);
            return;
        }

        // Real Stripe Checkout
        const result = await startCheckout(selectedPlan, {
            discountValue: appliedPromo ? appliedPromo.value : null,
            promoId: appliedPromo ? appliedPromo.promoId : null,
            promoDurationInMonths: appliedPromo ? appliedPromo.durationInMonths : null,
            promoValidForPlan: appliedPromo ? appliedPromo.validForPlan : null,
        });

        if (!result.success) {
            setCheckoutError(result.error || 'Failed to start checkout. Please try again.');
        }
    };

    const currentEmail = user ? user.email : email;

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', maxWidth: 960, margin: '0 auto' }}>

            {/* Page header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                <h1 style={{ fontSize: '2.6rem', marginBottom: 'var(--space-sm)' }}>Unlock Full Premium Access</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 580, margin: '0 auto' }}>
                    Get all 30 mock exams, the complete study handbook, pass probability engine and the pass-first-time refund guarantee.
                    Cancel your subscription anytime.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-xl" style={{ alignItems: 'start' }}>

                {/* ── Left: Checkout ── */}
                <div className="glass-panel" style={{ border: '1px solid var(--accent-primary)', position: 'relative' }}>
                    <div style={{
                        position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--accent-primary)', color: 'white',
                        padding: '3px 14px', borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap'
                    }}>
                        SECURE CHECKOUT
                    </div>

                    <h2 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.3rem' }}>
                        {step === 4 ? '🎉 Subscription Active!' :
                            (searchParams.get('reason') === 'free_exam' ?
                                (step === 1 ? 'Step 1 — Create Your Free Account'
                                    : step === 2 ? 'Step 2 — Verify Your Email'
                                        : 'Step 3 — You\'re Good to Go!')
                                : (step === 1 ? 'Step 1 — Enter your Email'
                                    : step === 2 ? 'Step 2 — Verify your Email'
                                        : 'Step 3 — Choose Your Plan'))
                        }
                    </h2>

                    {step < 4 && <StepBar step={step} />}

                    {/* ─ Step 1: Email ─ */}
                    {step === 1 && (
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                                {searchParams.get('reason') === 'free_exam'
                                    ? "Finish creating your account to start your free mock exam and save your results."
                                    : "We'll send a one-time code to verify your email. Existing subscribers are detected automatically."}
                            </p>
                            <InputField icon={Mail} placeholder="your@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} error={emailError} />
                            <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleEmailSubmit} disabled={loading}>
                                {loading ? <Loader2 size={18} className="spin" /> : <>Continue <ArrowRight size={16} /></>}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                                {displayedOtp
                                    ? <>A verification code has been sent to <strong style={{ color: 'white' }}>{email}</strong></>
                                    : <>We've sent a login link to <strong style={{ color: 'white' }}>{email}</strong>. Check your inbox and click the link, or enter the 6-digit code below.</>
                                }
                            </p>
                            {displayedOtp ? (
                                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>📬 Your verification code</p>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '0.3em', color: 'var(--success)', fontFamily: 'monospace' }}>{displayedOtp}</div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>(Development mode — in production this is emailed)</p>
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>📧 Check your email for a login link</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>Can't find it? Check your spam folder, or enter the 6-digit code below.</p>
                                </div>
                            )}
                            <InputField icon={KeyRound} placeholder="Enter 6-digit code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} error={otpError} />
                            <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleOtpSubmit} disabled={loading}>
                                {loading ? <Loader2 size={18} className="spin" /> : <><LogIn size={16} /> Verify Code</>}
                            </button>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'var(--space-sm)', cursor: 'pointer', width: '100%', textAlign: 'center' }} onClick={() => { setStep(1); setOtp(''); setOtpError(''); }}>
                                ← Use a different email
                            </button>
                        </div>
                    )}

                    {/* ─ Step 3: Plan select + Stripe Checkout ─ */}
                    {step === 3 && (
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
                                Signed in as <strong style={{ color: 'white' }}>{currentEmail}</strong>
                            </p>

                            {/* Plan picker */}
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                {PLANS.map(p => <PlanCard key={p.id} plan={p} selected={selectedPlan} onSelect={setSelectedPlan} />)}
                            </div>

                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                                {plan.billingNote} · Cancel anytime from your account settings
                            </p>

                            {/* Checkout error */}
                            {checkoutError && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-sm) var(--space-md)',
                                    marginBottom: 'var(--space-md)',
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                                }}>
                                    <AlertCircle size={16} color="var(--danger)" />
                                    <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{checkoutError}</span>
                                </div>
                            )}

                            {/* Subscribe button — redirects to Stripe */}
                            <button
                                className="btn btn-primary"
                                style={{
                                    width: '100%', marginBottom: 'var(--space-lg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 8, fontSize: '1.05rem', padding: 'var(--space-md)'
                                }}
                                onClick={handleStripeCheckout}
                                disabled={loading || checkoutLoading}
                            >
                                {(loading || checkoutLoading)
                                    ? <><Loader2 size={18} className="spin" /> Redirecting to Secure Checkout...</>
                                    : <><CreditCard size={18} /> Subscribe — {appliedPromo ? `Discounted ${appliedPromo.value}%` : `${plan.price}/${plan.period}`}</>}
                            </button>

                            {/* Alternative: Continue for free if coming from a free exam link */}
                            {searchParams.get('reason') === 'free_exam' && searchParams.get('redirect') && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ margin: 'var(--space-md) 0', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}>
                                        <div style={{ height: 1, background: 'var(--border-color)', flex: 1 }} />
                                        <span>OR</span>
                                        <div style={{ height: 1, background: 'var(--border-color)', flex: 1 }} />
                                    </div>
                                    <button
                                        onClick={() => navigate(searchParams.get('redirect'))}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}
                                    >
                                        Just continue to my free exam <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Stripe trust badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)',
                            }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    🔒 Powered by <strong>Stripe</strong> — bank-level security
                                </span>
                            </div>

                            {/* Promo code divider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or have a promo code?</span>
                                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                            </div>

                            {promoSuccess ? (
                                <div style={{ textAlign: 'center', padding: 'var(--space-md)', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
                                    <Gift size={24} color="var(--success)" style={{ marginBottom: 4 }} />
                                    <p style={{ color: 'var(--success)', fontWeight: 700, margin: 0 }}>
                                        {appliedPromo ? appliedPromo.message : 'Promo code applied! Unlocking premium…'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <div style={{ flex: 1 }}>
                                        <InputField icon={Tag} placeholder="Enter promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)} error={promoError} />
                                    </div>
                                    <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: 'var(--space-sm) var(--space-md)', whiteSpace: 'nowrap' }} onClick={handlePromoSubmit}>
                                        Apply
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─ Step 4: Success ─ */}
                    {step === 4 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
                                <ShieldCheck size={32} color="var(--success)" />
                            </div>
                            <h3 style={{ color: 'var(--success)', marginBottom: 'var(--space-sm)' }}>Subscription Active!</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                                You now have full access to all 30 mock exams and the complete study handbook.
                            </p>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/dashboard')}>
                                Go to Dashboard
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Right: Features + comparison ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                    <div className="glass-panel">
                        <h3 style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Star size={18} /> What's included with Premium
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {[
                                'All 30 Mock Exams (750+ questions)',
                                'Real exam-style questions',
                                'Timed mode (45 min) + untimed Study Mode',
                                'Weak topic tracking & pass probability score',
                                'Pass First Time Refund Guarantee',
                                'Detailed explanations for every answer',
                                'Unlimited retakes · Ad-free',
                                'Cancel your subscription anytime',
                            ].map(f => (
                                <li key={f} className="flex items-center gap-sm">
                                    <Check size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Comparison */}
                    <div className="glass-panel" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>Why choose PassBrita?</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <span></span>
                            <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>PassBrita</span>
                                <span>Others</span>
                            </div>
                        </div>
                        {[
                            ['Monthly price', '£9.99', '£10.99+'],
                            ['Mock Exams', '30', '5–10'],
                            ['Pass Guarantee', '✓', '✗'],
                            ['Cancel anytime', '✓', 'Often locked'],
                        ].map(([label, us, them]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}>
                                <span>{label}</span>
                                <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
                                    <span style={{ color: 'var(--success)', fontWeight: 600, minWidth: 80, textAlign: 'right' }}>{us}</span>
                                    <span style={{ color: 'var(--danger)', minWidth: 80, textAlign: 'right', textDecoration: 'line-through' }}>{them}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        🔒 Secure checkout powered by Stripe · Recurring card payment · Cancel anytime · Instant access
                    </p>
                </div>
            </div>
        </div>
    );
}
