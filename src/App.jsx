import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Shield, LogIn, LogOut, ShieldCheck, Menu, X, ArrowRight, Star, CheckCircle, Clock, BookOpen, BarChart2, Zap, Trophy } from 'lucide-react';

const BRAND = 'PASSBRITA';

import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import StudyMaterial from './pages/StudyMaterial';
import ExamViewer from './pages/ExamViewer';
import Pricing from './pages/Pricing';
import ExamsPage from './pages/ExamsPage';
import Guarantee from './pages/Guarantee';
import FreePractice from './pages/FreePractice';
import Admin from './pages/Admin';
import { useProgress } from './hooks/useProgress';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Home page (Landing page — conversion-optimized) ────────────
function Home() {
    const navigate = useNavigate();

    return (
        <div className="slide-up">
            {/* ═════════════════════════════════════════════════
                Section 1 — Hero
            ═════════════════════════════════════════════════ */}
            <section style={{
                padding: 'var(--space-2xl) var(--space-lg)',
                textAlign: 'center',
                background: 'radial-gradient(ellipse at 50% 20%, rgba(59,130,246,0.08), transparent 70%)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                    {/* Trust badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
                        borderRadius: 999, background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.3)', marginBottom: 'var(--space-lg)',
                        fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)'
                    }}>
                        <ShieldCheck size={15} /> Pass First Time — or Get a Full Refund
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(2.4rem, 6vw, 4rem)', lineHeight: 1.08,
                        marginBottom: 'var(--space-md)',
                        background: 'linear-gradient(135deg, #fff 30%, rgba(139,92,246,0.9))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Pass the Life in the UK Test — First Time Guaranteed
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: 580, margin: '0 auto var(--space-xl)', lineHeight: 1.7 }}>
                        30 realistic mock exams · 45-minute timed mode · AI weak-topic tracking · Know your pass probability before exam day.
                    </p>

                    {/* Social proof */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
                        {['⭐⭐⭐⭐⭐ Rated 4.9/5', '🎯 30 Mock Exams', '💷 From £1.99/wk', '🛡️ Pass Guarantee'].map(s => (
                            <span key={s} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s}</span>
                        ))}
                    </div>

                    <div className="flex justify-center gap-md" style={{ flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/life-in-the-uk-practice-test')} className="btn btn-primary" style={{ padding: 'var(--space-md) var(--space-2xl)', fontSize: '1.05rem', gap: 8 }}>
                            <Zap size={18} /> Start Free Practice Test
                        </button>
                        <button onClick={() => navigate('/pricing')} className="btn btn-secondary" style={{ padding: 'var(--space-md) var(--space-2xl)', fontSize: '1.05rem' }}>
                            Go Premium — from £1.99/week
                        </button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'var(--space-md)' }}>
                        Cancel anytime · Cheaper than the official e-learning (~£10.99 for 3 months)
                    </p>
                </div>
            </section>

            {/* ═════════════════════════════════════════════════
                Section 2 — Interactive Exam Preview
            ═════════════════════════════════════════════════ */}
            <section style={{ padding: 'var(--space-2xl) var(--space-lg)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: 640, margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-xs)', fontSize: '1.6rem' }}>
                        Try a Real Question
                    </h2>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        This is exactly what the test looks like. Can you get it right?
                    </p>

                    <ExamPreview onStart={() => navigate('/life-in-the-uk-practice-test')} />
                </div>
            </section>

            {/* ═════════════════════════════════════════════════
                Section 3 — Feature Cards
            ═════════════════════════════════════════════════ */}
            <section style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '1.6rem' }}>
                        Everything You Need to Pass
                    </h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-lg)' }}>
                        {[
                            { icon: '📊', h: '30 Mock Exams', p: '3 free to try. 30 total — matching the official difficulty spread. New question sets every attempt.' },
                            { icon: '⏱️', h: '45-Minute Timed Mode', p: 'Simulate real exam conditions with auto-submit when time runs out. Anti-cheat prevents refresh resets.' },
                            { icon: '🧠', h: 'AI Weak Topic Tracking', p: 'After each mock, see your topic breakdown and personalised study recommendations based on AI analysis.' },
                            { icon: '📈', h: 'Pass Probability Score', p: 'Our algorithm gives you a live % probability of passing, based on your mock exam history and trends.' },
                            { icon: '🛡️', h: 'Pass Guarantee', p: 'Complete all 30 mocks with ≥85% last-5 average, fail the real test — and we refund you, no questions asked.' },
                        ].map((f, i) => (
                            <div key={f.h} className="glass-panel fade-in" style={{ animationDelay: `${i * 0.07}s`, flex: '1 1 280px', maxWidth: '360px' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>{f.icon}</div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>{f.h}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.p}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═════════════════════════════════════════════════
                Section 4 — Pass Guarantee Explanation
            ═════════════════════════════════════════════════ */}
            <section style={{ padding: 'var(--space-2xl) var(--space-lg)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                    <div style={{
                        textAlign: 'center', padding: 'var(--space-2xl)',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))',
                        border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-xl)',
                    }}>
                        <ShieldCheck size={40} color="var(--success)" style={{ marginBottom: 'var(--space-md)' }} />
                        <h2 style={{ marginBottom: 'var(--space-md)', fontSize: '1.6rem' }}>The PassBrita Guarantee</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.75, marginBottom: 'var(--space-lg)' }}>
                            We're so confident in our platform that we offer a full refund if you don't pass.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', textAlign: 'left', maxWidth: 480, margin: '0 auto var(--space-lg)' }}>
                            {[
                                'Subscribe to Premium',
                                'Complete all 30 mock exams',
                                'Score ≥85% average on your last 5 mocks',
                                'Set your official exam date',
                                'If you fail — we refund you in full',
                            ].map((step, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', flexShrink: 0,
                                    }}>
                                        {i + 1}
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{step}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => navigate('/guarantee')} className="btn btn-secondary" style={{ gap: 6 }}>
                            Learn More <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </section>

            {/* ═════════════════════════════════════════════════
                Section 5 — Pricing
            ═════════════════════════════════════════════════ */}
            <section style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-xs)', fontSize: '1.6rem' }}>
                        Simple, Flexible Pricing
                    </h2>
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
                        Cancel anytime · No lock-in · Instant access
                    </p>

                    <div style={{ display: 'flex', gap: 'var(--space-lg)', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Weekly */}
                        <div className="glass-panel" style={{ flex: '1 1 280px', maxWidth: 340, textAlign: 'center', position: 'relative' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Weekly</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 4 }}>
                                £1.99<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/week</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
                                Perfect for short-term prep
                            </p>
                            <button onClick={() => navigate('/pricing')} className="btn btn-secondary" style={{ width: '100%' }}>
                                Get Started
                            </button>
                        </div>

                        {/* Monthly — best value */}
                        <div className="glass-panel" style={{
                            flex: '1 1 280px', maxWidth: 340, textAlign: 'center', position: 'relative',
                            borderColor: 'rgba(139,92,246,0.5)',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.07), rgba(139,92,246,0.07))',
                        }}>
                            <div style={{
                                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: 'white', fontSize: '0.72rem', fontWeight: 700,
                                padding: '4px 16px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}>
                                Best Value
                            </div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>Monthly</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 4 }}>
                                £3.99<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
                            </div>
                            <p style={{ color: 'var(--accent-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>
                                Save 50% vs weekly
                            </p>
                            <button onClick={() => navigate('/pricing')} className="btn btn-primary" style={{ width: '100%' }}>
                                Get Started
                            </button>
                        </div>
                    </div>

                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 'var(--space-lg)' }}>
                        Both plans include all 30 mock exams, study handbook, AI tracking, and the pass guarantee.
                    </p>
                </div>
            </section>

            {/* ═════════════════════════════════════════════════
                Final CTA
            ═════════════════════════════════════════════════ */}
            <section style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
                <div style={{
                    maxWidth: 640, margin: '0 auto', textAlign: 'center',
                    padding: 'var(--space-2xl)',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-xl)',
                }}>
                    <Trophy size={36} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-md)' }} />
                    <h2 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.5rem' }}>
                        Ready to Start Practising?
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        Try a free mock exam right now — no signup required.
                    </p>
                    <button onClick={() => navigate('/life-in-the-uk-practice-test')} className="btn btn-primary" style={{ fontSize: '1.05rem', padding: 'var(--space-md) var(--space-2xl)', gap: 8 }}>
                        Start Free Practice Test <ArrowRight size={16} />
                    </button>
                </div>
            </section>
        </div>
    );
}

// ── Interactive exam preview widget ────────────────────────────
function ExamPreview({ onStart }) {
    const [selected, setSelected] = useState(null);
    const correct = 0; // TRUE

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)',
                background: 'rgba(59,130,246,0.12)', borderRadius: 'var(--radius-pill)',
                padding: '3px 10px', marginBottom: 'var(--space-md)',
                border: '1px solid rgba(59,130,246,0.25)',
            }}>
                <BookOpen size={12} /> Sample Question
            </div>

            <h3 style={{ fontSize: '1.15rem', lineHeight: 1.5, marginBottom: 'var(--space-lg)', color: 'white' }}>
                The UK is made up of England, Scotland, Wales and Northern Ireland.
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                {['TRUE', 'FALSE'].map((opt, i) => {
                    const isSelected = selected === i;
                    const answered = selected !== null;
                    const isCorrect = i === correct;
                    let borderColor = 'rgba(255,255,255,0.1)', bgColor = 'rgba(255,255,255,0.04)';
                    let icon = null;

                    if (answered) {
                        if (isCorrect) {
                            borderColor = 'var(--success)'; bgColor = 'rgba(16,185,129,0.12)';
                            icon = <CheckCircle size={20} color="var(--success)" />;
                        } else if (isSelected) {
                            borderColor = 'var(--danger)'; bgColor = 'rgba(239,68,68,0.12)';
                        }
                    }

                    return (
                        <button key={i} onClick={() => { if (selected === null) setSelected(i); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                                padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)',
                                border: '2px solid ' + borderColor, background: bgColor,
                                color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500,
                                textAlign: 'left', cursor: answered ? 'default' : 'pointer',
                                transition: 'all 0.15s', fontFamily: 'inherit',
                            }}>
                            <span style={{
                                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255,255,255,0.1)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)'
                            }}>
                                {['A', 'B'][i]}
                            </span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {icon}
                        </button>
                    );
                })}
            </div>

            {selected !== null && (
                <div className="fade-in">
                    <div style={{
                        padding: 'var(--space-md) var(--space-lg)', background: 'rgba(59,130,246,0.07)',
                        borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: 4, fontSize: '0.82rem' }}>💡 Explanation</strong>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            The United Kingdom is made up of four countries: England, Scotland, Wales, and Northern Ireland.
                        </span>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <button onClick={onStart} className="btn btn-primary" style={{ gap: 6 }}>
                            Take the Full 24-Question Test <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Layout (nav + footer) ──────────────────────────────────────
function Layout({ children }) {
    const { progress } = useProgress();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isPremium = (user && progress.isPremium) || (user && user.isPremium);
    const [menuOpen, setMenuOpen] = useState(false);

    // Close menu on route change
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'techazyticket@gmail.com';
    const isAdmin = user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/exams', label: 'Exams' },
        { to: '/study', label: 'Study' },
        { to: '/guarantee', label: 'Guarantee' },
    ];

    if (isAdmin) {
        navLinks.push({ to: '/admin', label: 'Admin Portal' });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <header style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderBottom: '1px solid var(--border-color)',
                background: 'rgba(15,23,42,0.92)',
                backdropFilter: 'blur(14px)',
                position: 'sticky', top: 0, zIndex: 200,
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
                    <Link to="/" style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, letterSpacing: '-0.02em' }}>
                        <img src="/vite.svg" alt="Pass Brita 2026 Logo" style={{ width: 28, height: 28 }} /> {BRAND}
                    </Link>

                    <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'nowrap' }} className="desktop-nav">
                        {navLinks.map(l => (
                            <Link key={l.to} to={l.to} style={{ color: location.pathname === l.to ? 'white' : 'var(--text-secondary)', fontWeight: location.pathname === l.to ? 600 : 500, fontSize: '0.88rem', textDecoration: 'none', transition: 'color 0.15s' }}>
                                {l.label}
                            </Link>
                        ))}

                        {user && isPremium && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontWeight: 600, fontSize: '0.82rem' }}>
                                <ShieldCheck size={14} /> Premium
                            </span>
                        )}

                        {!isPremium && (
                            <Link to="/pricing" className="btn btn-primary" style={{ padding: '6px var(--space-md)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                Upgrade — from £1.99/week
                            </Link>
                        )}

                        {user ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.email}>
                                    {user.email.length > 18 ? user.email.slice(0, 16) + '…' : user.email}
                                </span>
                                <button onClick={logout} title="Log out" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.76rem', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                    <LogOut size={12} /> Log out
                                </button>
                            </div>
                        ) : (
                            <Link to="/pricing" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.82rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '3px 9px', textDecoration: 'none', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                <LogIn size={12} /> Login
                            </Link>
                        )}
                    </nav>

                    <button
                        className="burger-btn"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Toggle menu"
                        style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'none', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {menuOpen && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid var(--border-color)',
                        padding: 'var(--space-md) var(--space-lg)',
                        display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
                        zIndex: 199,
                    }}>
                        {navLinks.map(l => (
                            <Link key={l.to} to={l.to} style={{ color: location.pathname === l.to ? 'white' : 'var(--text-secondary)', fontWeight: location.pathname === l.to ? 600 : 500, fontSize: '1rem', textDecoration: 'none', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)' }}>
                                {l.label}
                            </Link>
                        ))}

                        {user && isPremium && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', padding: 'var(--space-sm) 0' }}>
                                <ShieldCheck size={15} /> Premium Member
                            </span>
                        )}

                        {!isPremium && (
                            <Link to="/pricing" className="btn btn-primary" style={{ textAlign: 'center', padding: 'var(--space-sm) var(--space-md)', fontSize: '0.9rem' }}>
                                Upgrade — from £1.99/week
                            </Link>
                        )}

                        {user ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-sm)' }}>
                                <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{user.email}</span>
                                <button onClick={() => { logout(); setMenuOpen(false); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: 'inherit' }}>
                                    <LogOut size={13} /> Log out
                                </button>
                            </div>
                        ) : (
                            <Link to="/pricing" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
                                <LogIn size={14} /> Login
                            </Link>
                        )}
                    </div>
                )}
            </header>

            <main style={{ flex: 1 }}>{children}</main>

            <footer style={{ padding: 'var(--space-lg) 0', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <p>© 2026 {BRAND} · Private prep service — not affiliated with the Home Office or GOV.UK · <Link to="/guarantee" style={{ color: 'var(--text-muted)' }}>Pass Guarantee</Link></p>
            </footer>
        </div>
    );
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const { progress } = useProgress();

    if (loading) {
        return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>Verifying access...</div>;
    }

    const isPremium = (user && progress.isPremium) || (user && user.isPremium);

    if (!user || !isPremium) {
        return <Navigate to="/pricing" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/study" element={<ProtectedRoute><Study /></ProtectedRoute>} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/study/:id" element={<ProtectedRoute><StudyMaterial /></ProtectedRoute>} />
                <Route path="/exam/:id" element={<ProtectedRoute><ExamViewer /></ProtectedRoute>} />
                <Route path="/exams" element={<ProtectedRoute><ExamsPage /></ProtectedRoute>} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/guarantee" element={<Guarantee />} />
                <Route path="/life-in-the-uk-practice-test" element={<FreePractice />} />
            </Routes>
        </Layout>
    );
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}
