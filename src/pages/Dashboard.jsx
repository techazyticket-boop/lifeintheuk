import React, { useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import { Link, useNavigate } from 'react-router-dom';
import { mockExams } from '../data/mockExams';
import { useAuth } from '../context/AuthContext';
import {
    Award, CheckCircle, Lock, TrendingUp, AlertTriangle,
    ExternalLink, ShieldCheck, BookOpen, BarChart2, Target, Play,
} from 'lucide-react';

// ── Colour helpers ─────────────────────────────────────────────
const accColor = acc => acc >= 75 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--danger)';
const accBadge = acc => acc >= 75 ? '✓ Strong' : acc >= 50 ? '⚠ Review' : '✗ Focus';

// The 5 official handbook chapters and which topics they map to
const CHAPTERS = [
    { key: 'ch1', emoji: '⚖️', label: 'Chapter 1', title: 'Values & Principles', topics: ['values'], chapId: 'chap-1' },
    { key: 'ch2', emoji: '🗺️', label: 'Chapter 2', title: 'What is the UK?', topics: ['geography'], chapId: 'chap-2' },
    { key: 'ch3', emoji: '📜', label: 'Chapter 3', title: 'A Long & Illustrious History', topics: ['history_early', 'history_modern', 'science'], chapId: 'chap-3' },
    { key: 'ch4', emoji: '🎭', label: 'Chapter 4', title: 'A Modern, Thriving Society', topics: ['culture', 'traditions', 'sport'], chapId: 'chap-4' },
    { key: 'ch5', emoji: '🏛️', label: 'Chapter 5', title: 'Government, Law & Your Role', topics: ['government'], chapId: 'chap-5' },
];

// Stat card
function StatCard({ label, value, sub, color, children, delay = 0 }) {
    return (
        <div className="glass-panel fade-in" style={{ textAlign: 'center', animationDelay: `${delay}s`, padding: 'var(--space-lg)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: color || 'white', lineHeight: 1, marginBottom: 4 }}>{value}</div>
            {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{sub}</p>}
            {children}
        </div>
    );
}

export default function Dashboard() {
    const { progress, getPassProbability, getWeakTopics, getRecentAverage, isGuaranteeEligible } = useProgress();
    const { user } = useAuth();
    const navigate = useNavigate();

    const totalExams = mockExams.length;
    const examsTaken = Object.keys(progress.examResults).length;
    const examsPassed = Object.values(progress.examResults).filter(e => e.passed).length;
    const passProb = getPassProbability();
    const recentAvg = getRecentAverage(5);
    const guaranteeEligible = isGuaranteeEligible();
    const isPremium = progress.isPremium || (user && user.isPremium);

    // ── Build per-chapter performance from all exam results ────
    const chapterStats = CHAPTERS.map(ch => {
        let correct = 0, total = 0;
        Object.values(progress.examResults).forEach(result => {
            if (!result.topicScores) return;
            ch.topics.forEach(topic => {
                const ts = result.topicScores[topic];
                if (ts) { correct += ts.correct; total += ts.total; }
            });
        });
        const acc = total > 0 ? Math.round((correct / total) * 100) : null;
        return { ...ch, correct, total, acc };
    });

    const chaptersWithData = chapterStats.filter(c => c.total > 0);
    const weakestChapter = chaptersWithData.length > 0
        ? [...chaptersWithData].sort((a, b) => a.acc - b.acc)[0]
        : null;

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'chapters'

    const tabStyle = active => ({
        padding: '8px 18px', borderRadius: 99, fontWeight: 600, fontSize: '0.85rem',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
        background: active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
        color: active ? 'white' : 'var(--text-muted)',
    });

    const firstName = user ? user.email.split('@')[0] : null;

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0' }}>

            {/* ── Header ─────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                <div>
                    <h2 style={{ marginBottom: 4 }}>{firstName ? `Hi, ${firstName} 👋` : 'Your Dashboard'}</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track your progress · identify weak chapters · pass first time</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={tabStyle(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button style={tabStyle(activeTab === 'chapters')} onClick={() => setActiveTab('chapters')}>
                        Chapter Analysis {chaptersWithData.length === 0 && '🔒'}
                    </button>
                </div>
            </div>

            {/* ── Subtle Conversion Banner ───────────────────── */}
            {!isPremium && (
                <div style={{ marginBottom: 'var(--space-xl)', padding: '12px var(--space-lg)', background: 'linear-gradient(90deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--accent-secondary)' }}>Upgrade to Premium:</strong> Unlock all 30 exams, full study materials, and Pass Guarantee.
                    </span>
                    <Link to="/pricing" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', background: 'var(--accent-secondary)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', textDecoration: 'none' }}>
                        Learn More
                    </Link>
                </div>
            )}

            {/* ════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <>
                    {/* ── Stats Row ──────────────────────────── */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                        <StatCard
                            label="Pass Probability" delay={0}
                            value={passProb > 0 ? passProb + '%' : '—'}
                            sub={passProb === 0 ? 'Take a mock to unlock' : 'Based on your results'}
                            color={passProb >= 75 ? 'var(--success)' : passProb > 0 ? 'var(--warning)' : 'var(--text-muted)'}
                        />
                        <StatCard label="Mocks Done" delay={0.05} value={examsTaken} sub={`${examsPassed} passed · ${totalExams - examsTaken} remaining`} color="white">
                            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 8 }}>
                                <div style={{ height: '100%', width: `${(examsTaken / totalExams) * 100}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', borderRadius: 99 }} />
                            </div>
                        </StatCard>
                        <StatCard label="Last 5 Average" delay={0.1} value={recentAvg > 0 ? recentAvg + '%' : '—'} sub="Need 85% for guarantee" color={recentAvg > 0 ? accColor(recentAvg) : 'var(--text-muted)'}>
                            {recentAvg > 0 && (
                                <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 8 }}>
                                    <div style={{ height: '100%', width: recentAvg + '%', background: accColor(recentAvg), borderRadius: 99 }} />
                                </div>
                            )}
                        </StatCard>
                        <StatCard label="Chapters Read" delay={0.15} value={`${progress.completedChapters.length}/${5}`} sub="Full handbook" color="white">
                            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 8 }}>
                                <div style={{ height: '100%', width: `${(progress.completedChapters.length / 5) * 100}%`, background: 'var(--success)', borderRadius: 99 }} />
                            </div>
                        </StatCard>
                    </div>

                    {/* ── Weakness alert if data exists ──────── */}
                    {weakestChapter && weakestChapter.acc < 75 && (
                        <div style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-md) var(--space-lg)', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                            <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '0.9rem' }}>Weakest area: </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{weakestChapter.emoji} {weakestChapter.label} — {weakestChapter.title} ({weakestChapter.acc}%)</span>
                            </div>
                            <button onClick={() => setActiveTab('chapters')} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: 'var(--warning)', borderRadius: 'var(--radius-md)', padding: '5px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit' }}>
                                See full breakdown →
                            </button>
                        </div>
                    )}

                    {/* ── No data nudge ──────────────────────── */}
                    {examsTaken === 0 && (
                        <div style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-xl)', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                            <Target size={32} color="var(--accent-primary)" style={{ marginBottom: 'var(--space-md)' }} />
                            <h4 style={{ marginBottom: 'var(--space-sm)' }}>Start your first mock exam</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>Take a mock to unlock your chapter analysis, pass probability, and weakness tracker.</p>
                            <button onClick={() => navigate('/exams')} className="btn btn-primary">Start Mock Exam 1 →</button>
                        </div>
                    )}

                    {/* ── Last 5 completed / next to take ───── */}
                    {(() => {
                        // Sort completed exams newest first, take 5
                        const completedEntries = Object.entries(progress.examResults)
                            .sort(([, a], [, b]) => new Date(b.date) - new Date(a.date))
                            .slice(0, 5);
                        const completedIds = new Set(completedEntries.map(([id]) => Number(id)));
                        const completedExams = completedEntries
                            .map(([id]) => mockExams.find(e => e.id === Number(id)))
                            .filter(Boolean);
                        // Pad with next untaken exams to always show 5
                        const remaining = 5 - completedExams.length;
                        const upcomingExams = remaining > 0
                            ? mockExams.filter(e => !completedIds.has(e.id)).slice(0, remaining)
                            : [];
                        const displayExams = [...completedExams, ...upcomingExams];
                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
                                {displayExams.map(exam => {
                                    const result = progress.examResults[exam.id];
                                    const isLocked = exam.isPremium && !isPremium;
                                    return (
                                        <button key={exam.id}
                                            onClick={() => isLocked ? navigate('/pricing') : navigate('/exam/' + exam.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid ' + (result ? (result.passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--border-color)'), background: result ? (result.passed ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)') : 'rgba(255,255,255,0.04)', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                                            onMouseLeave={e => e.currentTarget.style.background = result ? (result.passed ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)') : 'rgba(255,255,255,0.04)'}
                                        >
                                            {result
                                                ? <CheckCircle size={16} color={result.passed ? 'var(--success)' : 'var(--danger)'} />
                                                : isLocked ? <Lock size={14} color="var(--warning)" /> : <Play size={14} color="var(--accent-primary)" />}
                                            <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600 }}>{exam.title}</span>
                                            <span style={{ fontSize: '0.78rem', color: result ? accColor((result.score / 24) * 100) : 'var(--text-muted)', fontWeight: 700 }}>
                                                {result ? result.score + '/24' : !exam.isPremium ? 'FREE' : ''}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}
                    <Link to="/exams" style={{ display: 'block', textAlign: 'center', color: 'var(--accent-primary)', fontSize: '0.88rem', marginBottom: 'var(--space-xl)' }}>View all 30 mock exams →</Link>

                    {/* ── Pass Guarantee tracker (premium) ──── */}
                    {isPremium && (
                        <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', borderColor: guaranteeEligible ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                <ShieldCheck size={22} color={guaranteeEligible ? 'var(--success)' : 'var(--accent-primary)'} style={{ flexShrink: 0, marginTop: 2 }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>Pass Guarantee Progress</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 var(--space-md)' }}>
                                        Complete all 30 mocks with ≥85% last-5 average to qualify.
                                    </p>
                                    <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
                                        {[
                                            { label: '30 mocks done', done: examsTaken >= 30, text: `${Math.min(examsTaken, 30)}/30` },
                                            { label: 'Last 5 avg ≥ 85%', done: recentAvg >= 85, text: recentAvg + '%' },
                                        ].map(item => (
                                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {item.done ? <CheckCircle size={16} color="var(--success)" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-color)' }} />}
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                                                <span style={{ fontWeight: 700, color: item.done ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.85rem' }}>{item.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Link to="/guarantee" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', flexShrink: 0 }}>View terms →</Link>
                            </div>
                        </div>
                    )}

                    {/* ── GOV.UK CTA ─────────────────────────── */}
                    <div style={{ padding: 'var(--space-lg) var(--space-xl)', background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(59,130,246,0.07))', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                        <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Ready for the real test?</h4>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Book your official test on GOV.UK.</p>
                        </div>
                        <a href="https://www.gov.uk/life-in-the-uk-test" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                            Book on GOV.UK <ExternalLink size={14} />
                        </a>
                    </div>

                    {/* ── Upgrade upsell ─────────────────────── */}
                    {!isPremium && (
                        <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-xl)', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                            <h3 style={{ marginBottom: 'var(--space-sm)' }}>🔒 Unlock 27 More Exams + Full Study Guide</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', fontSize: '0.95rem' }}>
                                From £1.99/week — all 30 mocks, all 5 chapters, pass guarantee. Cancel anytime.
                            </p>
                            <Link to="/pricing" className="btn btn-primary">Start Your Subscription →</Link>
                        </div>
                    )}
                </>
            )}

            {/* ════════════════════════════════════════════════ */}
            {activeTab === 'chapters' && (
                <>
                    {chaptersWithData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                            <BarChart2 size={40} color="var(--text-muted)" style={{ marginBottom: 'var(--space-md)' }} />
                            <h4 style={{ marginBottom: 'var(--space-sm)' }}>No chapter data yet</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
                                Your chapter-by-chapter breakdown appears here after you complete at least one mock exam.
                            </p>
                            <button onClick={() => navigate('/exams')} className="btn btn-primary">Take Your First Mock →</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 var(--space-sm)' }}>
                                Based on {examsTaken} mock exam{examsTaken !== 1 ? 's' : ''} · 75%+ = strong · 50–74% = review · &lt;50% = focus here
                            </p>
                            {chapterStats.map(ch => {
                                const noData = ch.total === 0;
                                const color = noData ? 'var(--text-muted)' : accColor(ch.acc);
                                const badge = noData ? '— No data' : accBadge(ch.acc);
                                return (
                                    <div key={ch.key} style={{ padding: 'var(--space-lg) var(--space-xl)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + (noData ? 'var(--border-color)' : ch.acc >= 75 ? 'rgba(16,185,129,0.2)' : ch.acc >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.22)'), borderRadius: 'var(--radius-lg)', opacity: noData ? 0.5 : 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: noData ? 0 : 12, flexWrap: 'wrap' }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{ch.emoji}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{ch.label}</div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.title}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.75rem', color, fontWeight: 700, background: noData ? 'transparent' : 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: 999, border: noData ? 'none' : `1px solid ${color}` }}>{badge}</span>
                                                {!noData && <span style={{ fontSize: '1.15rem', fontWeight: 900, color }}>{ch.acc}%</span>}
                                            </div>
                                        </div>
                                        {!noData && (
                                            <>
                                                <div style={{ height: 9, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
                                                    <div style={{ height: '100%', width: ch.acc + '%', background: color, borderRadius: 99, transition: 'width 1.2s ease' }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                                    <span>{ch.correct} correct out of {ch.total} questions</span>
                                                    <button onClick={() => navigate('/study/' + ch.chapId)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>
                                                        {ch.acc < 75 ? 'Revise chapter →' : 'Review chapter →'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Study shortcut */}
                            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-lg)', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <BookOpen size={18} color="var(--accent-primary)" />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Want to re-read the material?</span>
                                </div>
                                <Link to="/study" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '7px 16px' }}>Open Study Guide →</Link>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
