import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogIn, LogOut, ShieldCheck, Menu, X } from 'lucide-react';

const BRAND = 'PassBrita';

import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import StudyMaterial from './pages/StudyMaterial';
import ExamViewer from './pages/ExamViewer';
import Pricing from './pages/Pricing';
import ExamsPage from './pages/ExamsPage';
import Guarantee from './pages/Guarantee';
import { useProgress } from './hooks/useProgress';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Home page ──────────────────────────────────────────────────
function Home() {
    const navigate = useNavigate();
    return (
        <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0' }}>

            {/* ── Hero ─────────────────────────────────────── */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                {/* Guarantee badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>
                    <ShieldCheck size={15} /> Pass First Time — or Get a Full Refund
                </div>

                <h1 style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', lineHeight: 1.1, marginBottom: 'var(--space-md)' }}>
                    The Smartest Way to Pass<br />the Life in the UK Test
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: 620, margin: '0 auto var(--space-xl)', lineHeight: 1.7 }}>
                    30 realistic mock exams · 45-min timed mode · Weak-topic tracking. Know your pass probability before exam day.
                </p>

                {/* Social proof */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
                    {['⭐⭐⭐⭐⭐ Rated 4.9/5', '🎯 30 Mock Exams', '💷 From £1.99/week', '🛡️ Pass Guarantee'].map(s => (
                        <span key={s} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s}</span>
                    ))}
                </div>

                <div className="flex justify-center gap-md" style={{ flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/exams')} className="btn btn-primary" style={{ padding: 'var(--space-md) var(--space-2xl)', fontSize: '1.05rem' }}>
                        Try 3 Free Exams →
                    </button>
                    <button onClick={() => navigate('/pricing')} className="btn btn-secondary" style={{ padding: 'var(--space-md) var(--space-2xl)', fontSize: '1.05rem' }}>
                        Go Premium — from £1.99/week
                    </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'var(--space-md)' }}>
                    Weekly or monthly subscription — cancel anytime. Cheaper than the official e-learning (~£10.99 for 3 months).
                </p>
            </div>

            {/* ── Features grid ───────────────────────────── */}
            <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>Everything You Need to Pass</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
                {[
                    { icon: '📊', h: '30 Mock Exams', p: '3 free to try. 30 total — 10 easy, 10 medium, 10 hard — mirroring the official difficulty spread.' },
                    { icon: '⏱️', h: '45-Minute Timed Mode', p: 'Simulate real exam conditions or use Study Mode with no time limit; switch anytime.' },
                    { icon: '🧠', h: 'Weak Topic Tracking', p: 'After each mock, see your topic breakdown and a ranked list of your weakest areas to focus on.' },
                    { icon: '📈', h: 'Pass Probability Score', p: 'Our algorithm gives you a live probability of passing, based on your mock exam history.' },
                    { icon: '🛡️', h: 'Pass Guarantee', p: 'Complete all 30 mocks with ≥85% last-5 average, fail the real test — and we refund you, no questions asked.' },
                ].map((f, i) => (
                    <div key={f.h} className="glass-panel fade-in" style={{ animationDelay: `${i * 0.07}s`, flex: '1 1 280px', maxWidth: '360px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>{f.icon}</div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-sm)' }}>{f.h}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.p}</p>
                    </div>
                ))}
            </div>

            {/* ── Pricing CTA ─────────────────────────────── */}
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-xl)' }}>
                <h2 style={{ marginBottom: 'var(--space-sm)' }}>Simple, Flexible Pricing</h2>
                <div style={{ display: 'flex', gap: 'var(--space-lg)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-xs)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>£1.99<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/week</span></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weekly plan</div>
                    </div>
                    <div style={{ width: 1, background: 'var(--border-color)', margin: '0 var(--space-md)' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>£3.99<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/month</span></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>Monthly — best value</div>
                    </div>
                </div>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 var(--space-xl)', fontSize: '0.9rem' }}>
                    Start Subscription — from £1.99/week
                    Cancel anytime · No lock-in · Instant access
                </p>
            </div>

        </div>
    );
}

// ── Layout (nav + footer) ──────────────────────────────────────
function Layout({ children }) {
    const { progress } = useProgress();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isPremium = progress.isPremium || (user && user.isPremium);
    const [menuOpen, setMenuOpen] = useState(false);

    // Close menu on route change
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/exams', label: 'Exams' },
        { to: '/study', label: 'Study' },
        { to: '/guarantee', label: 'Guarantee' },
    ];

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
                    {/* Logo */}
                    <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: '1.15rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <Shield size={24} color="var(--accent-primary)" /> {BRAND}
                    </Link>

                    {/* Desktop nav */}
                    <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'nowrap' }} className="desktop-nav">
                        {navLinks.map(l => (
                            <Link key={l.to} to={l.to} style={{ color: location.pathname === l.to ? 'white' : 'var(--text-secondary)', fontWeight: location.pathname === l.to ? 600 : 500, fontSize: '0.88rem', textDecoration: 'none', transition: 'color 0.15s' }}>
                                {l.label}
                            </Link>
                        ))}

                        {/* Premium badge — only for logged-in premium users */}
                        {user && isPremium && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontWeight: 600, fontSize: '0.82rem' }}>
                                <ShieldCheck size={14} /> Premium
                            </span>
                        )}

                        {/* Upgrade CTA — only for logged-in non-premium or guests */}
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

                    {/* Burger button — mobile only */}
                    <button
                        className="burger-btn"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Toggle menu"
                        style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'none', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile dropdown menu */}
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

                        {/* Premium badge — mobile, only for premium users */}
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

function AppRoutes() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/study" element={<Study />} />
                <Route path="/study/:id" element={<StudyMaterial />} />
                <Route path="/exam/:id" element={<ExamViewer />} />
                <Route path="/exams" element={<ExamsPage />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/guarantee" element={<Guarantee />} />
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
