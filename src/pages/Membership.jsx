import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import {
    CreditCard, Calendar, ShieldCheck, AlertCircle,
    ArrowLeft, Loader2, Zap, Clock, ShieldAlert,
    ChevronRight, Check, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Membership() {
    const { user, isPremium } = useAuth();
    const navigate = useNavigate();
    const {
        subscription, loading, checkoutLoading,
        currentPlan, periodEnd, isCanceled,
        cancelSubscription, changePlan, refreshSubscription,
        openCustomerPortal,
    } = useSubscription(user?.id, user?.email);

    const [message, setMessage] = useState(null);
    const [subError, setSubError] = useState(null);
    const [directSub, setDirectSub] = useState(null);

    // Direct fallback fetch — bypasses useSubscription hook timing issues
    useEffect(() => {
        if (!user?.id || subscription) return;
        async function directFetch() {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);
            if (error) {
                setSubError(error.message);
            } else if (data && data.length > 0) {
                setDirectSub(data[0]);
            }
        }
        directFetch();
    }, [user?.id, subscription]);

    const activeSub = subscription || directSub;

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel? Your premium access will continue until the end of your current period.')) return;
        const res = await cancelSubscription();
        if (res.success) {
            setMessage({ type: 'success', text: res.message });
            // Also update directSub so UI reflects cancellation immediately
            if (directSub) {
                setDirectSub(prev => prev ? { ...prev, cancel_at_period_end: true } : prev);
            }
        } else {
            setMessage({ type: 'danger', text: res.error });
        }
    };

    const handleChangePlan = async (newPlan) => {
        const res = await changePlan(newPlan);
        if (res.success) {
            setMessage({ type: 'success', text: res.message });
        } else {
            setMessage({ type: 'danger', text: res.error });
        }
    };

    if (loading && !directSub) {
        return (
            <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>
                <Loader2 className="spin" size={40} color="var(--accent-primary)" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-muted)' }}>Loading membership details...</p>
            </div>
        );
    }

    if (subError && !activeSub) {
        return (
            <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center', maxWidth: 600 }}>
                <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto var(--space-md)' }} />
                <h2>Could Not Load Membership</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)', fontSize: '0.9rem' }}>
                    There was a database error: {subError}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={refreshSubscription}>
                        <RefreshCw size={16} /> Retry
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                </div>
            </div>
        );
    }

    if (!activeSub) {
        return (
            <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center', maxWidth: 600 }}>
                {isPremium ? (
                    <>
                        <ShieldCheck size={48} color="var(--success)" style={{ margin: '0 auto var(--space-md)', opacity: 0.8 }} />
                        <h2>Premium Membership Active</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: 1.6 }}>
                            You have premium access, but we're still syncing your billing details from Stripe.
                            This usually fixes itself within a minute.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={refreshSubscription} disabled={loading}>
                                {loading ? <Loader2 className="spin" size={18} /> : 'Sync Billing Details'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                        </div>
                    </>
                ) : (
                    <>
                        <ShieldAlert size={48} color="var(--warning)" style={{ margin: '0 auto var(--space-md)' }} />
                        <h2>No Active Subscription Found</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
                            It looks like you don't have an active premium membership yet.
                        </p>
                        <button className="btn btn-primary" onClick={() => navigate('/pricing')}>View Plans & Pricing</button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0', maxWidth: 800 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={20} />
                </button>
                <h2 style={{ margin: 0 }}>Membership Management</h2>
            </div>

            {message && (
                <div style={{
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    marginBottom: 'var(--space-xl)',
                    display: 'flex', gap: 10, alignItems: 'center'
                }}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <span style={{ fontSize: '0.9rem' }}>{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                {/* ── Current Plan Card ── */}
                <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
                        <ShieldCheck size={20} color="var(--success)" />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Current Plan</span>
                    </div>

                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', marginBottom: 'var(--space-xs)', textTransform: 'capitalize' }}>
                        {(currentPlan || activeSub?.plan || 'Premium')} Membership
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-xl)' }}>
                        Status: <span style={{ color: (isCanceled || activeSub?.cancel_at_period_end) ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                            {(isCanceled || activeSub?.cancel_at_period_end) ? 'Canceled · Active until end of period' : 'Active'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', background: 'rgba(255,255,255,0.03)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Next Billing Date</span>
                            <span style={{ color: 'white', fontWeight: 600 }}>
                                {periodEnd ? periodEnd.toLocaleDateString() : activeSub?.current_period_end ? new Date(activeSub.current_period_end).toLocaleDateString() : '—'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                            <span style={{ color: 'white', fontWeight: 600 }}>{(currentPlan || activeSub?.plan) === 'monthly' ? '£9.99' : '£3.99'}</span>
                        </div>
                    </div>
                </div>

                {/* ── Actions Card ── */}
                <div className="glass-panel" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Manage Membership</h3>

                    {!isCanceled && (
                        <button
                            className="btn"
                            disabled={checkoutLoading}
                            onClick={handleCancel}
                            style={{ width: '100%', justifyContent: 'space-between', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldAlert size={16} /> Cancel Membership
                            </span>
                            {checkoutLoading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
                        </button>
                    )}

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: 'var(--space-sm) 0', paddingTop: 'var(--space-md)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>Switch Plan</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            <button
                                className="btn"
                                disabled={checkoutLoading || currentPlan === 'weekly'}
                                onClick={() => handleChangePlan('weekly')}
                                style={{ width: '100%', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white' }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap size={16} color="var(--accent-secondary)" /> Switch to Weekly (£3.99)
                                </span>
                                {currentPlan === 'weekly' ? <Check size={16} color="var(--success)" /> : <ChevronRight size={16} />}
                            </button>

                            <button
                                className="btn"
                                disabled={checkoutLoading || currentPlan === 'monthly'}
                                onClick={() => handleChangePlan('monthly')}
                                style={{ width: '100%', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white' }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Calendar size={16} color="var(--accent-primary)" /> Switch to Monthly (£9.99)
                                </span>
                                {currentPlan === 'monthly' ? <Check size={16} color="var(--success)" /> : <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-lg)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Looking for standard payment management? You can still
                    <button onClick={openCustomerPortal} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', padding: '0 4px', cursor: 'pointer', fontSize: 'inherit' }}>
                        open the Stripe Billing Portal
                    </button>
                    to update card details or view past invoices.
                </p>
            </div>
        </div>
    );
}
