import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studyMaterials } from '../data/studyMaterials';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../context/AuthContext';
import { BookOpen, CheckCircle, Lock, Clock, ChevronRight, Play } from 'lucide-react';

// Map chapters to the 5 official handbook chapters
const CHAPTERS = [
    { key: 'ch1', emoji: '⚖️', label: 'Chapter 1', chapId: 'chap-1', topics: ['values'] },
    { key: 'ch2', emoji: '🗺️', label: 'Chapter 2', chapId: 'chap-2', topics: ['geography'] },
    { key: 'ch3', emoji: '📜', label: 'Chapter 3', chapId: 'chap-3', topics: ['history_early', 'history_modern', 'science'] },
    { key: 'ch4', emoji: '🎭', label: 'Chapter 4', chapId: 'chap-4', topics: ['culture', 'traditions', 'sport'] },
    { key: 'ch5', emoji: '🏛️', label: 'Chapter 5', chapId: 'chap-5', topics: ['government'] },
];

export default function Study() {
    const { progress } = useProgress();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isPremium = (user && progress.isPremium) || (user && user.isPremium);
    const completedCount = progress.completedChapters.length;
    const totalCount = studyMaterials.length;

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0', maxWidth: 860 }}>

            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', marginBottom: 'var(--space-md)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
                    <BookOpen size={13} /> OFFICIAL HANDBOOK
                </div>
                <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', marginBottom: 'var(--space-sm)' }}>Study Materials</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>
                    All 5 chapters of the official Life in the UK handbook — covering every topic tested in the real exam.
                </p>

                {/* Overall progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                    <BookOpen size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Reading progress</span>
                            <span style={{ color: completedCount === totalCount ? 'var(--success)' : 'var(--accent-primary)', fontWeight: 700 }}>{completedCount}/{totalCount} chapters read</span>
                        </div>
                        <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(completedCount / totalCount) * 100}%`, background: completedCount === totalCount ? 'var(--success)' : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', borderRadius: 99, transition: 'width 1s ease' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Chapter cards ───────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {CHAPTERS.map((ch, idx) => {
                    const mat = studyMaterials.find(m => m.id === ch.chapId);
                    if (!mat) return null;
                    const isComplete = progress.completedChapters.includes(mat.id);
                    const isLocked = mat.isPremium && !isPremium;

                    return (
                        <div
                            key={ch.key}
                            onClick={() => navigate('/study/' + mat.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--space-lg)',
                                padding: 'var(--space-lg) var(--space-xl)',
                                background: isComplete ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)',
                                border: '1px solid ' + (isComplete ? 'rgba(16,185,129,0.25)' : isLocked ? 'rgba(245,158,11,0.2)' : 'var(--border-color)'),
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease',
                                opacity: isLocked ? 0.8 : 1,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = isComplete ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = isComplete ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isComplete ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = isComplete ? 'rgba(16,185,129,0.25)' : isLocked ? 'rgba(245,158,11,0.2)' : 'var(--border-color)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                        >
                            {/* Emoji icon */}
                            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
                                {ch.emoji}
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                                    {ch.label} {isLocked ? '· 🔒 Premium' : ''}
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mat.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {mat.timeToRead}</span>
                                    {isComplete && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontWeight: 600 }}><CheckCircle size={12} /> Completed</span>}

                                    {!isLocked && (
                                        <span
                                            onClick={(e) => { e.stopPropagation(); navigate('/exam/' + ch.chapId); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-primary)', fontWeight: 600, marginLeft: 'auto' }}
                                        >
                                            <Play size={10} fill="currentColor" /> Practice Questions
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right CTA */}
                            {isLocked
                                ? <Link to="/pricing" onClick={e => e.stopPropagation()} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px', flexShrink: 0 }}>Upgrade</Link>
                                : <ChevronRight size={20} color={isComplete ? 'var(--success)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                            }
                        </div>
                    );
                })}
            </div>

            {/* ── Upsell if not premium ─────────────────────────── */}
            {!isPremium && (
                <div style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-xl)', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: 'var(--space-sm)' }}>🔒</div>
                    <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.1rem' }}>Unlock 27 More Exams + Full Study Guide</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
                        From £1.99/week — all 30 mocks, all 5 chapters, pass guarantee. Cancel anytime.
                    </p>
                    <Link to="/pricing" className="btn btn-primary" style={{ padding: 'var(--space-sm) var(--space-xl)' }}>Start Your Subscription →</Link>
                </div>
            )}
        </div>
    );
}
