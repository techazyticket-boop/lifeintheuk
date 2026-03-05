import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../context/AuthContext';
import {
    ShieldCheck, Check, AlertCircle, CheckCircle,
    Lock, Send, X, Loader2, Info, FileText, Star,
    Calendar, Clock, Award, TrendingUp, Target
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────
function getDaysRemaining(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Motivational note helper ────────────────────────────────────
function getAvgNote(avg, examsTaken) {
    if (examsTaken < 5) return 'Complete at least 5 mocks to start tracking your average';
    if (avg >= 95) return '🏆 Outstanding — you\'re exam-ready!';
    if (avg >= 85) return '✅ Target achieved — keep it up!';
    if (avg >= 75) return '💪 Getting close — one more strong session and you\'re there!';
    if (avg >= 60) return '📈 Good progress — keep practising to hit 85%';
    return '🎯 Stay focused — every mock brings you closer to the target';
}

// ── Milestone row ───────────────────────────────────────────────
function Milestone({ done, label, value, target, note, motivational }) {
    const numericValue = typeof value === 'number' ? value : parseInt(value);
    const numericTarget = typeof target === 'number' ? target : parseInt(target);
    const widthPct = target ? Math.min(100, (numericValue / numericTarget) * 100) : (done ? 100 : 0);

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)',
            padding: 'var(--space-md) 0', borderBottom: '1px solid var(--border-color)'
        }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
                {done
                    ? <CheckCircle size={22} color="var(--success)" />
                    : <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.04)' }} />}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: done ? 'white' : 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: done ? 'var(--success)' : 'var(--accent-primary)' }}>
                        {value}{target && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}> / {target}</span>}
                    </span>
                </div>
                {target && (
                    <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{
                            height: '100%', borderRadius: 99,
                            transition: 'width 0.8s ease',
                            width: widthPct + '%',
                            background: done ? 'var(--success)' : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                        }} />
                    </div>
                )}
                {motivational && (
                    <p style={{ fontSize: '0.8rem', color: done ? 'var(--success)' : 'var(--accent-primary)', margin: 0, fontStyle: 'italic' }}>{motivational}</p>
                )}
                {note && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{note}</p>}
            </div>
        </div>
    );
}

// ── Claim modal ─────────────────────────────────────────────────
function ClaimModal({ userEmail, onClose, onSuccess, examDate, submitHandler }) {
    const [name, setName] = useState('');
    const [refNo, setRefNo] = useState('');
    const [testDate, setTestDate] = useState(examDate || '');
    const [firstAttempt, setFirstAttempt] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const isValid = name.trim() && refNo.trim() && testDate && firstAttempt;

    const submit = async () => {
        if (!isValid) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await submitHandler({ examDate: testDate, proofUrl: refNo });
            if (res.success) {
                setSent(true);
                onSuccess && onSuccess();
            } else {
                setError(res.reason || 'Submission failed. Please check your eligibility.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const inp = {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', color: 'white', fontSize: '0.95rem',
        padding: 'var(--space-sm) var(--space-md)', fontFamily: 'inherit', outline: 'none',
        marginBottom: 'var(--space-md)',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)' }}>
            <div className="glass-panel slide-up" style={{ maxWidth: 520, width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', zIndex: 1 }}>
                    <X size={20} />
                </button>

                {sent ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                        <CheckCircle size={52} color="var(--success)" style={{ marginBottom: 'var(--space-md)' }} />
                        <h3 style={{ marginBottom: 'var(--space-sm)', color: 'var(--success)' }}>Claim Submitted Successfully</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-lg)' }}>
                            We have received your guarantee claim and will review your eligibility. If approved, your refund will be issued within <strong style={{ color: 'white' }}>14 days</strong>. We'll be in touch via email.
                        </p>
                        <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                ) : (
                    <>
                        <h3 style={{ marginBottom: 4, fontSize: '1.2rem', paddingRight: 24 }}>Submit a Guarantee Claim</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
                            Please complete the details below. Our team will verify your eligibility and respond within 14 business days.
                        </p>

                        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', fontSize: '0.82rem', color: 'rgba(16,185,129,0.9)', lineHeight: 1.6 }}>
                            <strong>Refund cap:</strong> £50 · <strong>First attempt only</strong> · <strong>One claim per account</strong>
                        </div>

                        <label style={{ display: 'block', fontSize: '0.79rem', color: 'var(--text-muted)', marginBottom: 4 }}>Full name</label>
                        <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Smith" />

                        <label style={{ display: 'block', fontSize: '0.79rem', color: 'var(--text-muted)', marginBottom: 4 }}>Registered email</label>
                        <input style={{ ...inp, opacity: 0.65, cursor: 'not-allowed' }} value={userEmail || ''} readOnly />

                        <label style={{ display: 'block', fontSize: '0.79rem', color: 'var(--text-muted)', marginBottom: 4 }}>Official test reference or fail notice number</label>
                        <input style={inp} value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="e.g. LITUK-2026-XXXXXX" />

                        <label style={{ display: 'block', fontSize: '0.79rem', color: 'var(--text-muted)', marginBottom: 4 }}>Date you sat the official test</label>
                        <input
                            style={{ ...inp, opacity: 0.75, cursor: 'not-allowed' }}
                            type="date"
                            value={testDate}
                            readOnly
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '-8px 0 var(--space-md)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={11} /> Pre-filled from your saved exam date
                        </p>

                        {/* First attempt confirmation */}
                        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: 'var(--space-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
                            <input
                                type="checkbox"
                                checked={firstAttempt}
                                onChange={e => setFirstAttempt(e.target.checked)}
                                style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, accentColor: 'var(--success)', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                I confirm this is my <strong style={{ color: 'white' }}>first official Life in the UK test attempt</strong>. I understand that the guarantee covers only one attempt and one refund per account.
                            </span>
                        </label>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', fontSize: '0.82rem', color: 'var(--danger)' }}>
                                {error}
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!isValid || submitting) ? 0.5 : 1, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            onClick={submit}
                            disabled={!isValid || submitting}
                        >
                            {submitting ? <><Loader2 size={16} className="spin" /> Submitting…</> : <><Send size={16} /> Submit Pass Guarantee Claim</>}
                        </button>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-sm)' }}>
                            Claims reviewed within 14 business days · refund@passbrita.com
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Sub-section wrapper ─────────────────────────────────────────
function Section({ icon: Icon, iconColor, title, children, borderColor }) {
    return (
        <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', borderColor: borderColor || 'rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-lg)' }}>
                <Icon size={20} color={iconColor || 'var(--accent-primary)'} />
                <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{title}</h2>
            </div>
            {children}
        </div>
    );
}

function BulletList({ items, color }) {
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {items.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color || 'var(--accent-primary)', flexShrink: 0, marginTop: 7 }} />
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.92rem' }}>{item}</p>
                </li>
            ))}
        </ul>
    );
}

// ── Countdown Timer ─────────────────────────────────────────────
function CountdownDisplay({ days }) {
    if (days === null) return null;
    let color = 'var(--success)';
    let bg = 'rgba(16,185,129,0.1)';
    let border = 'rgba(16,185,129,0.3)';
    let label = 'days remaining until your official test';

    if (days < 0) {
        color = 'var(--danger)';
        bg = 'rgba(239,68,68,0.08)';
        border = 'rgba(239,68,68,0.25)';
        label = 'days since your scheduled test date';
    } else if (days === 0) {
        color = '#f59e0b';
        bg = 'rgba(245,158,11,0.1)';
        border = 'rgba(245,158,11,0.3)';
        label = 'Today is your test day — good luck! 🍀';
    } else if (days <= 7) {
        color = '#f59e0b';
        bg = 'rgba(245,158,11,0.1)';
        border = 'rgba(245,158,11,0.3)';
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap', marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-lg)' }}>
            <Clock size={20} color={color} />
            <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 800, color, lineHeight: 1, display: 'block' }}>
                    {days === 0 ? '🍀' : Math.abs(days)}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {days !== 0 ? label : ''}
                </span>
            </div>
        </div>
    );
}

// ── Main page ───────────────────────────────────────────────────
export default function Guarantee() {
    const { progress, getRecentAverage, isGuaranteeEligible, setExamDate, setGuaranteeClaimSubmitted, submitGuaranteeClaim } = useProgress();
    const { user } = useAuth();
    const [showClaim, setShowClaim] = useState(false);

    // Scroll to top whenever modal opens so it's always fully visible
    useEffect(() => {
        if (showClaim) window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [showClaim]);

    // Exam date local state
    const [examDateInput, setExamDateInput] = useState(progress.examDate || '');
    const [savedExamDate, setSavedExamDate] = useState(progress.examDate || '');
    const [dateError, setDateError] = useState('');
    const [dateSaved, setDateSaved] = useState(!!progress.examDate);

    const isPremium = progress.isPremium || (user && user.isPremium);
    const examsTaken = Object.keys(progress.examResults || {}).length;
    const recentAvg = getRecentAverage(5);
    const allMocksDone = examsTaken >= 30;
    const avgMet = recentAvg >= 85;

    // Compute milestones_completed_at: the latest exam date when all mocks done AND avg met
    const milestonesCompleted = allMocksDone && avgMet && isPremium;

    // Days remaining
    const daysRemaining = getDaysRemaining(savedExamDate);

    // Exam date validation
    const validateAndSaveDate = () => {
        setDateError('');
        if (!examDateInput) {
            setDateError('Please select a date.');
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const chosen = new Date(examDateInput);
        chosen.setHours(0, 0, 0, 0);
        if (chosen <= today) {
            setDateError('Your exam date must be in the future.');
            return;
        }
        setSavedExamDate(examDateInput);
        setDateSaved(true);
        setExamDate && setExamDate(examDateInput);
    };

    // Full eligibility check
    const eligible =
        isPremium &&
        allMocksDone &&
        avgMet &&
        savedExamDate &&
        daysRemaining !== null && daysRemaining >= 0 &&
        !progress.guaranteeClaimSubmitted;

    // What's blocking the claim
    const blockingReasons = [];
    if (!isPremium) blockingReasons.push('Active subscription required');
    if (!allMocksDone) blockingReasons.push(`${30 - examsTaken} more mock${30 - examsTaken !== 1 ? 's' : ''} to complete`);
    if (!avgMet) blockingReasons.push(examsTaken < 5 ? 'Complete at least 5 mocks to track your average' : `Average is ${recentAvg}% — need 85%`);
    if (!savedExamDate) blockingReasons.push('Set your official exam date above');
    if (savedExamDate && daysRemaining !== null && daysRemaining < 0) blockingReasons.push('Exam date has passed');
    if (progress.guaranteeClaimSubmitted) blockingReasons.push('You have already submitted a claim');

    const handleClaimSuccess = () => {
        setGuaranteeClaimSubmitted && setGuaranteeClaimSubmitted();
    };

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', maxWidth: 800 }}>

            {/* ── Hero ─────────────────── */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.18))', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg)', boxShadow: '0 0 32px rgba(16,185,129,0.15)' }}>
                    <ShieldCheck size={44} color="var(--success)" />
                </div>

                {/* Badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 999, padding: '6px 18px', marginBottom: 'var(--space-md)' }}>
                    <Award size={14} color="var(--success)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '0.08em' }}>PASS FIRST TIME GUARANTEE™</span>
                </div>

                <h1 style={{ fontSize: 'clamp(2rem,6vw,2.8rem)', marginBottom: 'var(--space-md)', lineHeight: 1.15 }}>
                    Pass First Time Guarantee™
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 620, margin: '0 auto var(--space-md)', lineHeight: 1.75 }}>
                    PassBrita is designed around one goal: helping you pass the Life in the UK test first time. Our structured mock exam system, 30 full-length practice papers, and smart weak-topic tracking give you every advantage — backed by a money-back guarantee.
                </p>

                {/* Disclaimer */}
                <div style={{ display: 'inline-flex', gap: 8, alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 16px', maxWidth: 580, textAlign: 'left' }}>
                    <Info size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', margin: 0, lineHeight: 1.6 }}>
                        PassBrita is an independent preparation platform and is not affiliated with the UK government, the Home Office, or HMPO.
                    </p>
                </div>
            </div>

            {/* ── Exam Date Card ────────── */}
            <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', borderColor: savedExamDate ? 'rgba(16,185,129,0.35)' : 'rgba(59,130,246,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)' }}>
                    <Calendar size={20} color="var(--accent-primary)" />
                    <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Your Official Test Date</h2>
                    {savedExamDate && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 999, padding: '2px 10px', marginLeft: 'auto' }}>SET ✓</span>}
                </div>

                {!savedExamDate ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                        Please enter your official test date to activate your guarantee tracking.
                    </p>
                ) : (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 4px' }}>
                            Your saved test date: <strong style={{ color: 'white' }}>{formatDate(savedExamDate)}</strong>
                        </p>
                        <CountdownDisplay days={daysRemaining} />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ display: 'block', fontSize: '0.79rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                            {savedExamDate ? 'Update your test date' : 'Enter your exam date'}
                        </label>
                        <input
                            type="date"
                            value={examDateInput}
                            onChange={e => { setExamDateInput(e.target.value); setDateError(''); setDateSaved(false); }}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: 'rgba(255,255,255,0.06)', border: `1px solid ${dateError ? 'var(--danger)' : 'var(--border-color)'}`,
                                borderRadius: 'var(--radius-md)', color: 'white', fontSize: '0.95rem',
                                padding: 'var(--space-sm) var(--space-md)', fontFamily: 'inherit', outline: 'none',
                            }}
                        />
                        {dateError && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: '4px 0 0' }}>{dateError}</p>}
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ whiteSpace: 'nowrap', padding: 'var(--space-sm) var(--space-xl)', height: 42 }}
                        onClick={validateAndSaveDate}
                        disabled={!examDateInput || examDateInput === savedExamDate}
                    >
                        <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        {savedExamDate ? 'Update Date' : 'Save Date'}
                    </button>
                </div>

                {!savedExamDate && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Lock size={11} /> Setting your exam date is required to unlock your guarantee claim.
                    </p>
                )}
            </div>

            {/* ── Live Progress Tracker ─── */}
            <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', borderColor: eligible ? 'rgba(16,185,129,0.45)' : 'rgba(59,130,246,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={20} color="var(--accent-primary)" />
                        <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Your Eligibility Progress</h2>
                    </div>
                    {eligible
                        ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 999, padding: '3px 12px' }}>✓ ELIGIBLE</span>
                        : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: 999, padding: '3px 12px' }}>In progress</span>}
                </div>

                {!isPremium && (
                    <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Lock size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            An active Premium subscription is required to qualify. <Link to="/pricing" style={{ color: 'var(--accent-primary)' }}>Subscribe →</Link>
                        </p>
                    </div>
                )}

                <Milestone
                    done={isPremium}
                    label="Active Premium subscription"
                    value={isPremium ? 'Active ✓' : 'Not active'}
                    motivational={isPremium ? '🏅 Subscription confirmed — you\'re covered!' : '⚡ Subscribe to activate your guarantee'}
                    note="Must be active at the time you sit the official test"
                />
                <Milestone
                    done={allMocksDone}
                    label="All 30 mock exams completed"
                    value={Math.min(examsTaken, 30)}
                    target={30}
                    motivational={allMocksDone ? '🎉 All 30 mocks done — brilliant work!' : `💪 ${30 - examsTaken} more to go — you've got this!`}
                />
                <Milestone
                    done={avgMet}
                    label="Final 5 mock average ≥ 85%"
                    value={recentAvg + '%'}
                    target={'85%'}
                    motivational={getAvgNote(recentAvg, examsTaken)}
                />
                <Milestone
                    done={!!savedExamDate && daysRemaining !== null && daysRemaining >= 0}
                    label="Official test date set"
                    value={savedExamDate ? formatDate(savedExamDate) : 'Not set'}
                    motivational={savedExamDate && daysRemaining !== null && daysRemaining >= 0 ? `📅 ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to go — stay focused!` : '📅 Set your test date above to complete this milestone'}
                />
                <Milestone
                    done={false}
                    label="Official test result confirmation"
                    value="Pending"
                    motivational="📋 After your test, submit your result to complete the claim"
                    note="Required at time of claim submission"
                />

                {/* Blocking reasons */}
                {blockingReasons.length > 0 && (
                    <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px', fontWeight: 600 }}>Still needed to unlock your claim:</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {blockingReasons.map((r, i) => (
                                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
                    {progress.guaranteeClaimSubmitted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <CheckCircle size={28} color="var(--success)" />
                            <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>Claim submitted — we'll be in touch within 14 business days.</p>
                        </div>
                    ) : eligible ? (
                        <>
                            <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                                🎉 All milestones complete! If you sat the official test and did not pass, submit your claim below.
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: 'var(--space-md) var(--space-2xl)',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                                    fontWeight: 700, fontSize: '1rem'
                                }}
                                onClick={() => setShowClaim(true)}
                            >
                                <Send size={16} /> Submit Pass Guarantee Claim
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 'var(--space-md) var(--space-2xl)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', cursor: 'not-allowed', fontFamily: 'inherit', fontSize: '0.95rem' }}>
                                <Lock size={15} /> Submit Guarantee Claim
                            </button>
                            <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)', margin: 0 }}>Complete all eligibility milestones above to unlock your claim</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── What You Receive ─────── */}
            <Section icon={ShieldCheck} iconColor="var(--success)" title="What You Receive" borderColor="rgba(16,185,129,0.25)">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 'var(--space-md)' }}>
                    If you complete the full programme, meet every eligibility requirement, sit the official Life in the UK test, and are unsuccessful — we will make it right.
                </p>
                <BulletList color="var(--success)" items={[
                    'A refund of your official test fee, issued within 14 days of successful claim verification.',
                    'Refund is capped at £50 and covers your first official test booking fee only.',
                    'No awkward conversations — if you followed the programme and still didn\'t pass, you qualify.',
                    'Your PassBrita access remains fully active so you can continue studying and retake with confidence.',
                ]} />
            </Section>

            {/* ── Eligibility Requirements ─ */}
            <Section icon={Target} iconColor="var(--accent-primary)" title="Eligibility Requirements">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)', lineHeight: 1.65 }}>
                    To qualify for a refund under the Pass First Time Guarantee™, you must satisfy <strong style={{ color: 'white' }}>all</strong> of the following:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {[
                        { n: '1', text: 'Maintain an active PassBrita subscription at the time you sit the official test.' },
                        { n: '2', text: 'Complete all 30 PassBrita mock exams.' },
                        { n: '3', text: 'Achieve an average score of 85% or higher across your final five completed mock exams.' },
                        { n: '4', text: 'Take the official Life in the UK test AFTER completing all eligibility milestones (subscription active, all 30 mocks done, average ≥ 85%).' },
                        { n: '5', text: 'Submit your official test result confirmation (pass/fail notice or test reference) when submitting your claim.' },
                        { n: '6', text: 'The guarantee applies to your first official test attempt only — not subsequent retakes.' },
                        { n: '7', text: 'Only one refund claim is allowed per user account. The refund is capped at £50.' },
                        { n: '8', text: 'If you receive a refund and subsequently retake the official test, no further payments will be made under this guarantee.' },
                    ].map(r => (
                        <div key={r.n} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                {r.n}
                            </span>
                            <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65, fontSize: '0.92rem', paddingTop: 3 }}>{r.text}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── Important Conditions ──── */}
            <Section icon={AlertCircle} iconColor="var(--warning)" title="Important Conditions" borderColor="rgba(245,158,11,0.2)">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)', lineHeight: 1.65 }}>
                    Please read these conditions carefully before submitting a claim.
                </p>
                <BulletList color="var(--warning)" items={[
                    'Only one guarantee claim is permitted per user account.',
                    'The refund is capped at £50, regardless of the test fee paid.',
                    'This guarantee covers your first official test attempt only.',
                    'If you receive a refund and subsequently retake the official test, no further payments will be made under this guarantee.',
                    'PassBrita reserves the right to verify all eligibility criteria and to decline claims that cannot be substantiated or appear fraudulent.',
                    'Providing false or misleading information in a claim submission will result in immediate disqualification.',
                ]} />
            </Section>

            {/* ── How to Submit ─────────── */}
            <Section icon={FileText} iconColor="var(--accent-secondary)" title="How to Submit a Claim">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: 'var(--space-lg)', lineHeight: 1.65 }}>
                    If you believe you are eligible, follow these steps:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {[
                        { step: '1', title: 'Set your exam date', body: 'Enter your official test date at the top of this page. This activates your guarantee countdown and is required before submitting a claim.' },
                        { step: '2', title: 'Complete all milestones', body: 'Ensure your subscription is active, complete all 30 mock exams, and achieve an 85% average across your final 5. Your claim button unlocks automatically.' },
                        { step: '3', title: 'Gather your documents', body: 'After your test, keep your official fail notice or test reference number — you\'ll need this when submitting your claim.' },
                        { step: '4', title: 'Submit your claim', body: 'Click "Submit Pass Guarantee Claim", confirm this is your first attempt, and fill in the form. Our team will handle everything from there.' },
                        { step: '5', title: 'Await verification', body: 'We will verify your eligibility against your account records. Approved refunds are issued within 14 days of verification.' },
                    ].map(s => (
                        <div key={s.step} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                            <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(139,92,246,0.12)', border: '2px solid var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                                {s.step}
                            </span>
                            <div>
                                <p style={{ color: 'white', fontWeight: 600, margin: '0 0 2px', fontSize: '0.92rem', paddingTop: 4 }}>{s.title}</p>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.87rem', lineHeight: 1.6 }}>{s.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── Closing statement ─────── */}
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.06))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-xl)' }}>
                <ShieldCheck size={32} color="var(--success)" style={{ marginBottom: 'var(--space-md)' }} />
                <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.3rem' }}>Built on Confidence, Not Just Promise</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto', fontSize: '0.95rem' }}>
                    We offer this guarantee because we believe in what we've built. The PassBrita programme is structured, thorough, and proven. Follow it properly, and passing first time isn't just possible — it's expected.
                </p>
            </div>

            {/* ── Disclaimer ───────────── */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Info size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.79rem', lineHeight: 1.7, margin: 0 }}>
                        PassBrita is an independent, privately operated test preparation service. We are not affiliated with, endorsed by, or connected to the Home Office, His Majesty's Passport Office (HMPO), or any department of the UK Government. Our mock exams are original questions written by our team based exclusively on the publicly available official "Life in the United Kingdom: A Guide for New Residents" handbook. PassBrita does not provide, reproduce, or imply access to official test questions. Booking the real Life in the UK test must be done independently via <a href="https://www.gov.uk/life-in-the-uk-test" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>GOV.UK</a>.
                    </p>
                </div>
            </div>

            {showClaim && (
                <ClaimModal
                    userEmail={user?.email}
                    onClose={() => setShowClaim(false)}
                    onSuccess={handleClaimSuccess}
                    examDate={savedExamDate}
                    submitHandler={submitGuaranteeClaim}
                />
            )}
        </div>
    );
}
