import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { questionBank, TOPIC_LABELS, TOPICS } from '../data/mockExams';
import { createSessionShuffler, EXAM_CONSTANTS } from '../services/examEngine';
import { CheckCircle, XCircle, Clock, BookOpen, ArrowRight, Star, ShieldCheck, Share2, Trophy, Zap, BarChart2 } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const FREE_EXAM_QUESTIONS = 24;
const EXAM_MINUTES = 45;

// ── SEO meta tag helper ──────────────────────────────────────
function SEOHead() {
    useEffect(() => {
        document.title = 'Free Life in the UK Practice Test — 24 Questions, 45 Minutes | PassBrita';
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'description';
            document.head.appendChild(meta);
        }
        meta.content = 'Take a free Life in the UK practice test with 24 official-style questions. Timed at 45 minutes, just like the real exam. See your score instantly and get personalised study recommendations.';
    }, []);
    return null;
}

export default function FreePractice() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState('landing'); // landing | exam | results
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [secondsLeft, setSecondsLeft] = useState(EXAM_MINUTES * 60);
    const timerRef = useRef(null);
    const sessionSeed = useRef(Math.floor(Math.random() * 100000));
    const sessionShuffle = useMemo(() => createSessionShuffler(sessionSeed.current), []);

    // Generate a free exam from the question bank
    const freeQuestions = useMemo(() => {
        const seed = Date.now() % 99999;
        const shuffler = createSessionShuffler(seed);
        const indices = questionBank.map((_, i) => i);
        const shuffled = shuffler(indices, 42);
        return shuffled.slice(0, FREE_EXAM_QUESTIONS).map((origIdx, i) => {
            const q = questionBank[origIdx];
            const isTF = q.opts.length === 2 &&
                q.opts.map(o => o.toUpperCase()).includes('TRUE') &&
                q.opts.map(o => o.toUpperCase()).includes('FALSE');

            if (isTF) {
                return {
                    id: `free-q-${i}`,
                    question: q.q,
                    options: ['TRUE', 'FALSE'],
                    correctIndex: q.correctIndex,
                    explanation: q.e,
                    topic: q.topic,
                    isTrueFalse: true,
                };
            }

            const optMapped = sessionShuffle(q.opts.map((opt, oi) => ({ opt, origIndex: oi })), i * 37);
            return {
                id: `free-q-${i}`,
                question: q.q,
                options: optMapped.map(s => s.opt),
                _optionMapping: optMapped.map(s => s.origIndex),
                correctIndex: q.correctIndex,
                explanation: q.e,
                topic: q.topic,
                isTrueFalse: false,
            };
        });
    }, [sessionShuffle]);

    const [serverResult, setServerResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Timer
    const finishRef = useRef(null);

    const finishExam = useCallback(async () => {
        clearInterval(timerRef.current);
        setIsSubmitting(true);
        setPhase('submitting');
        window.scrollTo(0, 0);

        // Convert answers to Original Indices using the option mapping
        const mappedAnswers = {};
        freeQuestions.forEach(q => {
            const sel = answers[q.id];
            if (sel !== undefined && sel !== null) {
                if (q._optionMapping) {
                    mappedAnswers[q.id] = q._optionMapping[sel];
                } else {
                    mappedAnswers[q.id] = sel;
                }
            }
        });

        try {
            const seed = sessionSeed.current;
            const res = await fetch('/api/validateExam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: `free-${seed}`,
                    answers: mappedAnswers
                })
            });
            const data = await res.json();
            setServerResult(data);
            setPhase('results');
        } catch (e) {
            console.error('Validation failed', e);
            alert('Failed to submit exam. Please try again.');
            setPhase('exam');
            setIsSubmitting(false);
        }
    }, [answers, freeQuestions]);
    finishRef.current = finishExam;

    useEffect(() => {
        if (phase !== 'exam') return;
        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    finishRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    // ── Share Score ───────────────────────────────────────────
    const handleShare = () => {
        if (!serverResult) return;
        const text = `🇬🇧 I scored ${serverResult.score}/${FREE_EXAM_QUESTIONS} on the Life in the UK practice test!\nCan you beat me? Try it free:`;
        const url = window.location.origin + '/life-in-the-uk-practice-test';

        if (navigator.share) {
            navigator.share({ title: 'Life in the UK Practice Test', text, url }).catch(() => { });
        } else {
            navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
                alert('Score copied to clipboard! Share it with your friends.');
            }).catch(() => { });
        }
    };

    // ═══════════════════════════════════════════════════════════
    // LANDING PHASE — SEO-optimized public page
    // ═══════════════════════════════════════════════════════════
    if (phase === 'landing') {
        return (
            <>
                <SEOHead />
                <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0' }}>
                    {/* Hero */}
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
                            borderRadius: 999, background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.3)', marginBottom: 'var(--space-lg)',
                            fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)'
                        }}>
                            <Trophy size={15} /> 100% Free — No Signup Required
                        </div>

                        <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)', lineHeight: 1.1, marginBottom: 'var(--space-md)' }}>
                            Free Life in the UK<br />Practice Test
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: 620, margin: '0 auto var(--space-xl)', lineHeight: 1.7 }}>
                            24 official-style questions · 45-minute timer · Instant results with explanations.
                            Just like the real exam — completely free.
                        </p>

                        <button
                            onClick={() => setPhase('exam')}
                            className="btn btn-primary"
                            style={{ padding: 'var(--space-md) var(--space-2xl)', fontSize: '1.1rem', gap: 8 }}
                        >
                            Start Free Practice Test →
                        </button>

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 'var(--space-md)' }}>
                            No registration needed. Start instantly.
                        </p>
                    </div>

                    {/* Preview question */}
                    <div style={{ maxWidth: 640, margin: '0 auto var(--space-2xl)' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', textAlign: 'center' }}>
                            🔍 Preview Question
                        </h2>
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
                                The Magna Carta was signed in 1215 and established that the king was subject to the law.
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {['TRUE', 'FALSE'].map((opt, i) => (
                                    <div key={i} style={{
                                        padding: 'var(--space-md) var(--space-lg)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)',
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                                    }}>
                                        <span style={{
                                            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                                            background: 'rgba(255,255,255,0.1)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)'
                                        }}>
                                            {OPTION_LABELS[i]}
                                        </span>
                                        <span>{opt}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
                                <button onClick={() => setPhase('exam')} className="btn btn-primary" style={{ gap: 6 }}>
                                    Start Full Test (24 Questions) <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* What you get */}
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                        <h2 style={{ marginBottom: 'var(--space-lg)' }}>What's Included</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-lg)' }}>
                            {[
                                { icon: <BookOpen size={24} />, h: '24 Questions', p: 'Same format as the official Life in the UK test' },
                                { icon: <Clock size={24} />, h: '45-Minute Timer', p: 'Timed exactly like the real examination' },
                                { icon: <CheckCircle size={24} />, h: 'Instant Results', p: 'See explanations for every question' },
                                { icon: <BarChart2 size={24} />, h: 'Topic Breakdown', p: 'Find your weak areas to study' },
                            ].map((f, i) => (
                                <div key={i} className="glass-panel" style={{ flex: '1 1 220px', maxWidth: 280, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-sm)' }}>{f.icon}</div>
                                    <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-xs)' }}>{f.h}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{f.p}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pass mark explanation */}
                    <div className="glass-panel" style={{ maxWidth: 640, margin: '0 auto var(--space-2xl)', borderColor: 'rgba(59,130,246,0.3)' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)', fontSize: '1.2rem' }}>
                            📋 About the Life in the UK Test
                        </h2>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                            <p>The Life in the UK test is a computer-based exam required for settlement or naturalisation in the UK. Here are the key facts:</p>
                            <ul style={{ padding: '0 0 0 var(--space-lg)', margin: 'var(--space-md) 0' }}>
                                <li><strong>24 questions</strong> — multiple choice and true/false</li>
                                <li><strong>45 minutes</strong> — to complete the test</li>
                                <li><strong>75% pass mark</strong> — you need at least 18/24 correct</li>
                                <li><strong>£50 fee</strong> — per test attempt</li>
                                <li>Questions cover <strong>British values, history, traditions, government, and geography</strong></li>
                            </ul>
                            <p>Our practice tests mirror the official format exactly, so you know what to expect on exam day.</p>
                        </div>
                    </div>

                    {/* CTA */}
                    <div style={{
                        textAlign: 'center', padding: 'var(--space-2xl)',
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
                        border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-xl)',
                    }}>
                        <Star size={32} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-md)' }} />
                        <h2 style={{ marginBottom: 'var(--space-sm)' }}>Want More Practice?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', maxWidth: 500, margin: '0 auto var(--space-lg)' }}>
                            Unlock 30 full mock exams, the complete study handbook, weak topic tracking, and the pass guarantee — from just £1.99/week.
                        </p>
                        <div className="flex justify-center gap-md" style={{ flexWrap: 'wrap' }}>
                            <button onClick={() => setPhase('exam')} className="btn btn-primary" style={{ fontSize: '1.05rem' }}>
                                Start Free Test First →
                            </button>
                            <Link to="/pricing" className="btn btn-secondary" style={{ fontSize: '1.05rem' }}>
                                View Premium Plans
                            </Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (phase === 'submitting') {
        return (
            <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>
                <div style={{ marginBottom: 'var(--space-lg)', display: 'inline-flex', justifyContent: 'center', width: 48, height: 48, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <h2>Scoring Your Exam...</h2>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // RESULTS PHASE
    // ═══════════════════════════════════════════════════════════
    if (phase === 'results' && serverResult) {
        const { score, percentage, passed, topicBreakdown } = serverResult;

        // Pass Probability Calculation
        const passProbability = passed
            ? Math.min(percentage + Math.round(Math.random() * 5), 99)
            : Math.max(percentage - 15, 10);

        return (
            <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', maxWidth: 700 }}>
                {/* Score card */}
                <div className="glass-panel" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    <div style={{
                        width: 96, height: 96, borderRadius: '50%', margin: '0 auto var(--space-lg)',
                        background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        border: '3px solid ' + (passed ? 'var(--success)' : 'var(--danger)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Trophy size={48} color={passed ? 'var(--success)' : 'var(--danger)'} />
                    </div>
                    <h2 style={{ fontSize: '2.2rem', marginBottom: 'var(--space-xs)' }}>
                        {passed ? '🎉 You Passed!' : 'Keep Practicing'}
                    </h2>
                    <div style={{ fontSize: '4.5rem', fontWeight: 900, color: passed ? 'var(--success)' : 'var(--danger)', lineHeight: 1, marginBottom: 'var(--space-xs)' }}>
                        {percentage}%
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                        <strong style={{ color: 'white' }}>{score} / {FREE_EXAM_QUESTIONS}</strong> correct · Pass mark: 18/24 (75%)
                    </p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 'var(--space-lg)' }}>
                        Est. Pass Probability: {passProbability}%
                    </p>

                    {/* Share button */}
                    <button onClick={handleShare} className="btn btn-secondary" style={{ gap: 8, marginBottom: 'var(--space-lg)' }}>
                        <Share2 size={16} /> Share Your Score
                    </button>

                    {!passed && (
                        <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: 8 }}>Ready for the real test?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                                You scored {score}/24. <strong>Most people who score below 18 fail the real test.</strong>
                            </p>
                            <Link to="/pricing" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                Unlock 30 Full Mock Exams & Pass Guarantee
                            </Link>
                        </div>
                    )}
                </div>

                {/* Topic breakdown */}
                <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)', fontSize: '1.1rem' }}>
                        <BarChart2 size={18} color="var(--accent-primary)" /> Weak Topics
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {Object.entries(topicBreakdown).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total)).map(([topic, s]) => {
                            const acc = Math.round((s.correct / s.total) * 100);
                            const color = acc >= 75 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--danger)';
                            return (
                                <div key={topic}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{TOPIC_LABELS[topic] || topic}</span>
                                        <span style={{ color, fontWeight: 700 }}>{s.correct}/{s.total} ({acc}%)</span>
                                    </div>
                                    <div className="progress-container" style={{ height: 6 }}>
                                        <div className="progress-bar" style={{ width: acc + '%', background: color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* CTA: Unlock full access if they passed */}
                {passed && (
                    <div style={{
                        padding: 'var(--space-xl)', textAlign: 'center',
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
                        border: '1px solid rgba(139,92,246,0.3)', borderRadius: 'var(--radius-lg)',
                    }}>
                        <ShieldCheck size={28} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-sm)' }} />
                        <h3 style={{ marginBottom: 'var(--space-sm)' }}>Ready for the real test?</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                            You passed this mock, but the real test has thousands of possible questions. Unlock 30 full mock exams and our pass guarantee.
                        </p>
                        <div className="flex justify-center gap-md" style={{ flexWrap: 'wrap' }}>
                            <Link to="/pricing" className="btn btn-primary" style={{ gap: 6 }}>
                                <Star size={16} /> Upgrade Now
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // EXAM PHASE — 24 questions, 45 minutes
    // ═══════════════════════════════════════════════════════════
    const currentQ = freeQuestions[currentIndex];
    const progressPercent = (currentIndex / freeQuestions.length) * 100;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    const isLow = secondsLeft < 300;
    const isCritical = secondsLeft < 60;

    const handleSelect = (qId, displayIndex) => {
        if (answers[qId] !== undefined) return;
        setAnswers(prev => ({ ...prev, [qId]: displayIndex }));
    };

    const handleNext = () => {
        if (currentIndex < freeQuestions.length - 1) {
            setCurrentIndex(p => p + 1);
        } else {
            finishExam();
        }
    };

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0', maxWidth: 800 }}>
            {/* Top bar */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                <Link to="/life-in-the-uk-practice-test" className="btn btn-secondary" style={{ padding: 'var(--space-xs) var(--space-md)', gap: 6 }}>
                    ← Exit
                </Link>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Free Practice Test</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Q {currentIndex + 1} of {freeQuestions.length}</div>
                </div>
                <span style={{
                    fontSize: '0.9rem', fontWeight: 700,
                    color: isCritical ? '#dc2626' : isLow ? '#ef4444' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: isLow ? '4px 8px' : '0',
                    borderRadius: isLow ? 'var(--radius-md)' : '0',
                    background: isCritical ? 'rgba(220,38,38,0.2)' : isLow ? 'rgba(239,68,68,0.15)' : 'transparent',
                    border: isLow ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                    animation: isCritical ? 'pulse 1s infinite' : 'none',
                }}>
                    <Clock size={14} /> {m}:{s.toString().padStart(2, '0')}
                </span>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
                <div className="progress-container" style={{ height: 5 }}>
                    <div className="progress-bar" style={{ width: progressPercent + '%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>{Object.keys(answers).length}/{freeQuestions.length} answered</span>
                    <span>{Math.round((Object.keys(answers).length / freeQuestions.length) * 100)}% complete</span>
                </div>
            </div>

            {/* Question card */}
            <div className="glass-panel fade-in" style={{ padding: 'var(--space-xl)' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)',
                    background: 'rgba(59,130,246,0.12)', borderRadius: 'var(--radius-pill)',
                    padding: '3px 10px', marginBottom: 'var(--space-md)',
                    border: '1px solid rgba(59,130,246,0.25)',
                }}>
                    <BookOpen size={12} /> Question {currentIndex + 1}
                </div>

                <h2 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', fontWeight: 700, marginBottom: 'var(--space-xl)', lineHeight: 1.5, whiteSpace: 'pre-line', color: 'white' }}>
                    {currentQ.question}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                    {currentQ.options.map((opt, i) => {
                        const isSelected = answers[currentQ.id] === i;
                        let borderColor = 'rgba(255,255,255,0.1)', bgColor = 'rgba(255,255,255,0.04)';
                        let labelBg = 'rgba(255,255,255,0.1)', labelColor = 'var(--text-muted)';

                        if (isSelected) {
                            borderColor = 'var(--accent-primary)'; bgColor = 'rgba(59,130,246,0.12)';
                            labelBg = 'rgba(59,130,246,0.3)'; labelColor = 'var(--accent-primary)';
                        }

                        return (
                            <button key={i}
                                onClick={() => handleSelect(currentQ.id, i)}
                                disabled={isSubmitting}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                                    padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)',
                                    border: '2px solid ' + borderColor, background: bgColor,
                                    color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500,
                                    textAlign: 'left', cursor: isSubmitting ? 'default' : 'pointer',
                                    transition: 'all 0.15s ease', fontFamily: 'inherit',
                                }}
                            >
                                <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: labelBg, color: labelColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                                    {OPTION_LABELS[i]}
                                </span>
                                <span style={{ flex: 1 }}>{opt}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center" style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
                    <button className="btn btn-secondary" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0 || isSubmitting} style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}>
                        ← Previous
                    </button>
                    <button className="btn btn-primary" onClick={handleNext} disabled={answers[currentQ.id] === undefined || isSubmitting}>
                        {currentIndex === freeQuestions.length - 1 ? '🏁 Submit Exam' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
