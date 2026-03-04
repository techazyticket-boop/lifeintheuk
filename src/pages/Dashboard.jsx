import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../context/AuthContext';
import { EXAM_CONSTANTS } from '../services/examEngine';
import {
    BarChart2, BookOpen, CheckCircle, Target, FlaskConical,
    Flame, Star, ShieldCheck, TrendingUp, Award, Zap, ArrowRight, Lock
} from 'lucide-react';

const CHAPTERS = [
    { chapId: 'chap-1', label: 'Chapter 1', title: 'Values & Principles', topics: ['values'], emoji: '⚖️' },
    { chapId: 'chap-2', label: 'Chapter 2', title: 'What is the UK?', topics: ['geography'], emoji: '🗺️' },
    { chapId: 'chap-3', label: 'Chapter 3', title: 'A Long & Illustrious History', topics: ['history_early', 'history_modern', 'science'], emoji: '📜' },
    { chapId: 'chap-4', label: 'Chapter 4', title: 'A Modern, Thriving Society', topics: ['culture', 'traditions', 'sport'], emoji: '🎭' },
    { chapId: 'chap-5', label: 'Chapter 5', title: 'The UK Government, the Law & Your Role', topics: ['government'], emoji: '🏛️' },
];

function StatCard({ icon: Icon, iconColor, label, value, subtext, bg }) {
    return (
        <div style={{
            background: bg || 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            transition: 'all 0.2s',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon size={18} color={iconColor || 'var(--accent-primary)'} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: 'white' }}>{value}</div>
            {subtext && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{subtext}</div>}
        </div>
    );
}

export default function Dashboard() {
    const {
        progress, getPassProbability, getRecentAverage, getStreak,
        getWeakTopics, getTopicMastery, getStudyRecs, getScoreHistory,
        isGuaranteeEligible, TOPIC_LABELS, EXAM_CONSTANTS: EC,
    } = useProgress();
    const { user } = useAuth();
    const isPremium = progress.isPremium || (user && user.isPremium);

    const examsTaken = Object.keys(progress.examResults || {}).length;
    const passProbability = getPassProbability();
    const recentAvg = getRecentAverage(5);
    const streak = getStreak();
    const weakTopics = getWeakTopics(5);
    const topicMastery = getTopicMastery();
    const studyRecs = getStudyRecs();
    const scoreHistory = getScoreHistory();
    const chaptersRead = (progress.completedChapters || []).length;

    // Chapter-specific analysis
    const chapterStats = useMemo(() => {
        return CHAPTERS.map(ch => {
            let correct = 0, total = 0;
            Object.values(progress.examResults || {}).forEach(result => {
                if (!result.topicScores) return;
                ch.topics.forEach(t => {
                    if (result.topicScores[t]) {
                        correct += result.topicScores[t].correct;
                        total += result.topicScores[t].total;
                    }
                });
            });
            return { ...ch, correct, total, acc: total ? Math.round((correct / total) * 100) : null };
        });
    }, [progress.examResults]);

    // Guarantee status
    const guaranteeEligible = isGuaranteeEligible();

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h2 style={{ marginBottom: 'var(--space-xs)' }}>Your Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Track your progress, identify weak areas, and prepare to pass first time.</p>
            </div>

            {/* ── Key Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md" style={{ marginBottom: 'var(--space-xl)' }}>
                {/* Advanced Pass Probability Widget */}
                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Target size={18} color={passProbability >= 75 ? 'var(--success)' : passProbability >= 50 ? 'var(--warning)' : 'var(--danger)'} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Pass Probability</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: 'white', marginBottom: 'var(--space-sm)' }}>{passProbability}%</div>

                    {/* Confidence Indicator */}
                    <div style={{ display: 'flex', gap: 2, height: 6, marginBottom: 8, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ flex: 1, background: passProbability > 0 ? (passProbability >= 75 ? 'var(--success)' : passProbability >= 50 ? 'var(--warning)' : 'var(--danger)') : 'rgba(255,255,255,0.1)' }} />
                        <div style={{ flex: 1, background: passProbability > 33 ? (passProbability >= 75 ? 'var(--success)' : passProbability >= 50 ? 'var(--warning)' : 'var(--danger)') : 'rgba(255,255,255,0.1)' }} />
                        <div style={{ flex: 1, background: passProbability > 66 ? (passProbability >= 75 ? 'var(--success)' : passProbability >= 50 ? 'var(--warning)' : 'var(--danger)') : 'rgba(255,255,255,0.1)' }} />
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {examsTaken === 0 ? 'Complete a mock to start' : passProbability >= 75 ? 'Looking confident!' : 'Complete more mock exams to improve prediction accuracy.'}
                    </div>
                </div>

                <StatCard
                    icon={TrendingUp}
                    iconColor="var(--accent-secondary)"
                    label="Recent Average"
                    value={examsTaken ? recentAvg + '%' : '—'}
                    subtext={examsTaken >= 5 ? `Last 5 exams · Need 85% for guarantee` : `Need ${5 - examsTaken} more mocks`}
                />

                <StatCard
                    icon={Flame}
                    iconColor={streak >= 3 ? '#f59e0b' : 'var(--text-muted)'}
                    label="Study Streak"
                    value={streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''} 🔥` : '0 days'}
                    subtext={streak >= 7 ? 'Incredible consistency!' : streak >= 3 ? 'Building momentum!' : 'Start a streak today'}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md" style={{ marginBottom: 'var(--space-2xl)' }}>
                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <FlaskConical size={18} color="var(--accent-primary)" />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Mock Exams Completed</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: 'white', marginBottom: 'var(--space-sm)' }}>{examsTaken} / {EC.TOTAL_EXAMS}</div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${Math.min(100, (examsTaken / EC.TOTAL_EXAMS) * 100)}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 1s ease-out' }} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{EC.TOTAL_EXAMS - examsTaken} mock exams remaining</div>
                </div>

                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <BookOpen size={18} color="var(--accent-primary)" />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Chapters Read</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: 'white', marginBottom: 'var(--space-sm)' }}>{chaptersRead} / 5</div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${(chaptersRead / 5) * 100}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 1s ease-out' }} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{chaptersRead === 5 ? 'All chapters completed!' : `${5 - chaptersRead} chapters remaining`}</div>
                </div>

                <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Award size={18} color={guaranteeEligible ? 'var(--success)' : 'var(--text-muted)'} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Pass Guarantee</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1, color: 'white', marginBottom: 'var(--space-sm)' }}>{guaranteeEligible ? '✓ Eligible' : 'In Progress'}</div>

                    {/* Progress details */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Complete 30 Mocks</span>
                            <span style={{ color: examsTaken >= 30 ? 'var(--success)' : 'inherit' }}>{examsTaken >= 30 ? '✓' : `${examsTaken}/30`}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>85% avg in last 5</span>
                            <span style={{ color: recentAvg >= 85 ? 'var(--success)' : 'inherit' }}>{examsTaken >= 5 ? (recentAvg >= 85 ? '✓' : `${recentAvg}%`) : 'N/A'}</span>
                        </div>
                        {!isPremium && <div style={{ color: 'var(--accent-primary)', marginTop: 4 }}>Unlock Premium to qualify.</div>}
                    </div>
                </div>
            </div>

            {/* ── Score History Chart ── */}
            {
                scoreHistory.length > 0 && (
                    <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>
                            <BarChart2 size={18} color="var(--accent-primary)" /> Score History
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, padding: '0 4px' }}>
                            {scoreHistory.slice(-20).map((s, i) => {
                                const height = Math.max(8, (s.percentage / 100) * 100);
                                const color = s.passed ? 'var(--success)' : 'var(--danger)';
                                return (
                                    <div key={i} style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2,
                                    }}>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                            {s.percentage}%
                                        </span>
                                        <div style={{
                                            width: '100%',
                                            maxWidth: 28,
                                            height: height + '%',
                                            background: color,
                                            borderRadius: '4px 4px 0 0',
                                            transition: 'height 0.5s ease',
                                            opacity: 0.7 + (i / scoreHistory.length) * 0.3,
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span>Oldest</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: 2 }} /> Passed</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--danger)', borderRadius: 2 }} /> Failed</span>
                            </span>
                            <span>Latest</span>
                        </div>
                    </div>
                )
            }

            {/* ── Topic Mastery ── */}
            <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', marginBottom: 'var(--space-lg)' }}>
                    <BarChart2 size={18} color="var(--accent-secondary)" /> Topic Mastery
                </h3>
                {examsTaken === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                        Complete your first mock exam to see topic mastery.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {topicMastery.filter(t => t.total > 0).map(t => {
                            const color = t.accuracy >= 75 ? 'var(--success)' : t.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)';
                            return (
                                <div key={t.topic}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
                                        <span style={{ color, fontWeight: 700 }}>{t.accuracy}%</span>
                                    </div>
                                    <div className="progress-container" style={{ height: 8 }}>
                                        <div className="progress-bar" style={{ width: t.accuracy + '%', background: color, transition: 'width 1s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── AI Study Recommendations ── */}
            {
                studyRecs.recommendations.length > 0 && (
                    <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', borderColor: 'rgba(139,92,246,0.3)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', marginBottom: 'var(--space-xs)' }}>
                            <Zap size={18} color="var(--accent-secondary)" /> AI Study Recommendations
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
                            {studyRecs.message}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {studyRecs.recommendations.slice(0, 5).map((rec, i) => {
                                const prioColor = rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--warning)' : 'var(--success)';
                                const prioLabel = rec.priority === 'high' ? '🔴 Focus' : rec.priority === 'medium' ? '🟡 Review' : '🟢 Strong';
                                return (
                                    <div key={i} style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        background: `rgba(${rec.priority === 'high' ? '239,68,68' : rec.priority === 'medium' ? '245,158,11' : '16,185,129'},0.06)`,
                                        border: `1px solid ${prioColor}33`,
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                                    }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: prioColor, flexShrink: 0 }}>{prioLabel}</span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>{rec.action}</span>
                                        {rec.accuracy !== undefined && (
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: prioColor, flexShrink: 0 }}>{rec.accuracy}%</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            }

            {/* ── Chapter Analysis ── */}
            <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', marginBottom: 'var(--space-lg)' }}>
                    <BookOpen size={18} color="var(--accent-primary)" /> Chapter Performance
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {chapterStats.map(ch => {
                        const acc = ch.acc;
                        const color = acc === null ? 'var(--text-muted)' : acc >= 75 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--danger)';
                        return (
                            <div key={ch.chapId}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '1.1rem' }}>{ch.emoji}</span>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ch.label}</div>
                                            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{ch.title}</div>
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>
                                        {acc !== null ? `${acc}%` : 'No data'}
                                    </span>
                                </div>
                                <div className="progress-container" style={{ height: 6 }}>
                                    <div className="progress-bar" style={{ width: (acc || 0) + '%', background: color, transition: 'width 1s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Pass Guarantee Tracker ── */}
            <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', borderColor: guaranteeEligible ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', margin: 0 }}>
                        <ShieldCheck size={18} color={guaranteeEligible ? 'var(--success)' : 'var(--accent-primary)'} /> Pass Guarantee
                    </h3>
                    {guaranteeEligible && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 999, padding: '3px 12px' }}>✓ ELIGIBLE</span>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {[
                        {
                            done: isPremium,
                            label: 'Active Premium subscription',
                            value: isPremium ? 'Active ✓' : 'Not active',
                        },
                        {
                            done: examsTaken >= 30,
                            label: 'Complete all 30 mock exams',
                            value: `${Math.min(examsTaken, 30)} / 30`,
                            progress: Math.min(100, (examsTaken / 30) * 100),
                        },
                        {
                            done: recentAvg >= 85,
                            label: 'Average ≥ 85% on last 5 mocks',
                            value: examsTaken >= 5 ? `${recentAvg}%` : 'Need 5 mocks',
                            progress: examsTaken >= 5 ? Math.min(100, (recentAvg / 85) * 100) : 0,
                        },
                        {
                            done: !!progress.examDate,
                            label: 'Official test date set',
                            value: progress.examDate || 'Not set',
                        },
                    ].map((m, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: m.done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${m.done ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-md)',
                        }}>
                            {m.done
                                ? <CheckCircle size={16} color="var(--success)" />
                                : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-color)' }} />}
                            <span style={{ flex: 1, fontSize: '0.85rem', color: m.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{m.label}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: m.done ? 'var(--success)' : 'var(--accent-primary)' }}>{m.value}</span>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
                    <Link to="/guarantee" className="btn btn-secondary" style={{ gap: 6 }}>
                        {guaranteeEligible ? <><ShieldCheck size={16} /> View Guarantee</> : <>Learn More <ArrowRight size={14} /></>}
                    </Link>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md" style={{ marginBottom: 'var(--space-xl)' }}>
                <Link to="/exams" className="glass-panel" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FlaskConical size={22} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem', marginBottom: 2 }}>Mock Exams</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>30 full practice papers · 24 questions each</div>
                    </div>
                    <ArrowRight size={18} color="var(--text-muted)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </Link>

                <Link to="/study" className="glass-panel" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BookOpen size={22} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem', marginBottom: 2 }}>Study Handbook</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Complete study materials · All 5 chapters</div>
                    </div>
                    <ArrowRight size={18} color="var(--text-muted)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </Link>
            </div>

            {/* ── Premium CTA ── */}
            {
                !isPremium && (
                    <div style={{
                        padding: 'var(--space-xl)',
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center',
                    }}>
                        <Star size={32} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-md)' }} />
                        <h3 style={{ marginBottom: 'var(--space-sm)' }}>Unlock Full Access</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                            Get all 30 mock exams, the complete study handbook, and the pass guarantee from just £1.99/week.
                        </p>
                        <Link to="/pricing" className="btn btn-primary">Upgrade to Premium</Link>
                    </div>
                )
            }
        </div >
    );
}
