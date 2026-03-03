import React from 'react';
import { Link } from 'react-router-dom';
import { mockExams } from '../data/mockExams';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Lock, Play, Star } from 'lucide-react';

export default function ExamsPage() {
    const { progress } = useProgress();
    const { user } = useAuth();
    const isPremium = progress.isPremium || (user && user.isPremium);

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0' }}>
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <Link to="/dashboard" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>← Back to Dashboard</Link>
                <h2 style={{ marginTop: 'var(--space-md)', marginBottom: 'var(--space-xs)' }}>All Mock Exams</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    24 questions per exam · 45 minutes · 18/24 to pass (75%)
                </p>
            </div>

            <div className="grid grid-cols-1 gap-md">
                {mockExams.map((exam, index) => {
                    const result = progress.examResults[exam.id];
                    const isLocked = exam.isPremium && !isPremium;
                    const isFree = !exam.isPremium;

                    return (
                        <Link
                            key={exam.id}
                            to={isLocked ? '/pricing' : '/exam/' + exam.id}
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="exam-row-card" style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-lg) var(--space-xl)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all var(--transition-fast)',
                                cursor: 'pointer',
                                opacity: isLocked ? 0.85 : 1,
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}
                            >
                                {/* Left: Number + Title */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: '50%',
                                        background: result
                                            ? (result.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)')
                                            : (isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.15)'),
                                        border: `2px solid ${result ? (result.passed ? 'var(--success)' : 'var(--danger)') : (isLocked ? 'var(--border-color)' : 'var(--accent-primary)')}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: '1.1rem',
                                        color: result ? (result.passed ? 'var(--success)' : 'var(--danger)') : (isLocked ? 'var(--text-muted)' : 'var(--accent-primary)'),
                                        flexShrink: 0,
                                    }}>
                                        {index + 1}
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{exam.title}</span>
                                            {isFree && (
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                                                    borderRadius: 'var(--radius-pill)',
                                                    background: 'rgba(16,185,129,0.15)',
                                                    color: 'var(--success)',
                                                    border: '1px solid rgba(16,185,129,0.3)',
                                                    textTransform: 'uppercase', letterSpacing: '0.05em'
                                                }}>FREE</span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            24 questions · 45 minutes
                                            {result && ` · Last score: ${result.score}/24`}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexShrink: 0 }}>
                                    {result && (
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '1.5rem', fontWeight: 800,
                                                color: result.passed ? 'var(--success)' : 'var(--danger)'
                                            }}>
                                                {Math.round((result.score / 24) * 100)}%
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {result.passed ? '✓ Passed' : '✗ Failed'}
                                            </div>
                                        </div>
                                    )}
                                    {isLocked ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 600
                                        }}>
                                            <Lock size={16} /> Unlock
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
                                        }}>
                                            <Play size={16} color="white" fill="white" style={{ marginLeft: 2 }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Premium Upsell */}
            {!isPremium && (
                <div style={{
                    marginTop: 'var(--space-2xl)',
                    padding: 'var(--space-xl)',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                }}>
                    <Star size={32} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-md)' }} />
                    <h3 style={{ marginBottom: 'var(--space-sm)' }}>Unlock All 30 Exams</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        Subscribe from £1.99/week or £3.99/month for full access to all 30 mock exams, the study handbook and the pass guarantee. Cancel anytime.
                    </p>
                    <Link to="/pricing" className="btn btn-primary">Start Your Subscription</Link>
                </div>
            )}
        </div>
    );
}
