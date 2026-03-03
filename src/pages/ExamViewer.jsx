import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { mockExams, questionBank } from '../data/mockExams';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, Award, BookOpen, Clock, Zap, RotateCcw, BarChart2 } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const EXAM_MINUTES = 45;

// ── Timer display ─────────────────────────────────────────────
function TimerBadge({ seconds, timed }) {
    if (!timed) return (
        <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={14} /> Study Mode
        </span>
    );
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const isLow = seconds < 300; // < 5 mins
    return (
        <span style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: isLow ? '#ef4444' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: isLow ? '4px 8px' : '0',
            borderRadius: isLow ? 'var(--radius-md)' : '0',
            background: isLow ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            border: isLow ? '1px solid rgba(239, 68, 68, 0.3)' : 'border: 1px solid transparent',
            transition: 'all 0.3s ease'
        }}>
            <Clock size={14} color={isLow ? '#ef4444' : 'var(--text-muted)'} />
            {m}:{s.toString().padStart(2, '0')}
        </span>
    );
}

// ── Mode picker shown before exam starts ─────────────────────
function ModePicker({ exam, onStart }) {
    const [mode, setMode] = useState('timed');
    return (
        <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
            <div className="glass-panel">
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>📝</div>
                <h2 style={{ marginBottom: 'var(--space-xs)' }}>{exam.title}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)', fontSize: '0.9rem' }}>
                    24 questions · Pass mark 75% (18/24)
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', justifyContent: 'center' }}>
                    {[
                        { id: 'timed', icon: '⏱️', label: 'Timed Exam', sub: '45 min · Real conditions' },
                        { id: 'study', icon: '📖', label: 'Study Mode', sub: 'No time limit' },
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setMode(opt.id)}
                            style={{
                                flex: 1, padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                                border: `2px solid ${mode === opt.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                background: mode === opt.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                                color: 'var(--text-primary)', textAlign: 'center', transition: 'all 0.2s',
                                fontFamily: 'inherit',
                            }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{opt.icon}</div>
                            <div style={{ fontWeight: 700 }}>{opt.label}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{opt.sub}</div>
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem', padding: 'var(--space-md)' }} onClick={() => onStart(mode)}>
                    Start {mode === 'timed' ? 'Timed Exam' : 'Study Mode'} →
                </button>
            </div>
        </div>
    );
}

export default function ExamViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { progress, saveExamResult } = useProgress();
    const { user } = useAuth();

    const isChapterExam = String(id).startsWith('chap-');

    const exam = useMemo(() => {
        if (isChapterExam) {
            const CHAPTERS = [
                { id: 'chap-1', title: 'Chapter 1 Practice', topics: ['values'] },
                { id: 'chap-2', title: 'Chapter 2 Practice', topics: ['geography'] },
                { id: 'chap-3', title: 'Chapter 3 Practice', topics: ['history_early', 'history_modern', 'science'] },
                { id: 'chap-4', title: 'Chapter 4 Practice', topics: ['culture', 'traditions', 'sport'] },
                { id: 'chap-5', title: 'Chapter 5 Practice', topics: ['government'] },
            ];
            const chap = CHAPTERS.find(c => c.id === id);
            if (!chap) return null;
            const chapQs = questionBank.filter(q => chap.topics.includes(q.topic));
            // Deterministic shuffle for this session
            let s = 12345;
            const rand = () => { const x = Math.sin(s++) * 10000; return x - Math.floor(x); };
            const shuffled = [...chapQs].sort(() => 0.5 - rand()).slice(0, 24);

            return {
                id: id,
                title: chap.title,
                isPremium: ['chap-3', 'chap-4', 'chap-5'].includes(id),
                passThreshold: Math.max(1, Math.floor(shuffled.length * 0.75)),
                questions: shuffled.map((q, i) => {
                    const isTrueFalse = q.opts.length === 2 && q.opts.map(o => o.toUpperCase()).includes('TRUE');
                    return {
                        id: `cq-${id}-${i}`,
                        question: q.q,
                        options: isTrueFalse ? ['TRUE', 'FALSE'] : q.opts,
                        correctAnswer: q.a,
                        explanation: q.e,
                        topic: q.topic,
                        isTrueFalse
                    };
                })
            };
        }
        return mockExams.find(e => e.id === Number(id));
    }, [id, isChapterExam]);

    const isPremium = progress.isPremium || (user && user.isPremium);

    // All exams → timed only (45 min, real conditions). Mode picker removed.
    const [mode, setMode] = useState('timed');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isFinished, setIsFinished] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(EXAM_MINUTES * 60);
    const timerRef = useRef(null);

    // One random seed per session — options re-order on every page load
    const sessionSeed = useRef(Math.floor(Math.random() * 100000));

    // Fisher-Yates with seed — deterministic for this session only
    const sessionShuffle = (arr, extraSeed) => {
        const a = [...arr];
        let s = sessionSeed.current + extraSeed;
        const rand = () => { const x = Math.sin(s++) * 10000; return x - Math.floor(x); };
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    // Shuffle options per-session (True/False questions keep TRUE first, FALSE second)
    const shuffledQuestions = useMemo(() => {
        if (!exam) return [];
        return exam.questions.map((q, qi) => ({
            ...q,
            options: q.isTrueFalse ? ['TRUE', 'FALSE'] : sessionShuffle(q.options, qi * 37),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam?.id]);  // only recalculate when exam changes, not on every render

    // Start/stop timer based on mode
    useEffect(() => {
        if (mode !== 'timed' || isFinished) return;
        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); finishExam(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [mode, isFinished]);

    useEffect(() => { window.scrollTo(0, 0); }, [currentIndex]);

    if (!exam) return <div className="container" style={{ padding: 'var(--space-2xl) 0' }}><p>Exam Not Found</p></div>;
    if (exam.isPremium && !isPremium) { navigate('/pricing'); return null; }
    // Free exams: mode is pre-set to 'timed' — mode picker never shown
    // Premium exams: premium users see mode picker
    if (!mode) return <ModePicker exam={exam} onStart={m => setMode(m)} />;

    const handleSelect = (questionId, option) => {
        if (answers[questionId]) return;
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    const handleNext = () => {
        if (currentIndex < shuffledQuestions.length - 1) {
            setCurrentIndex(p => p + 1);
        } else {
            finishExam();
        }
    };

    const finishExam = () => {
        clearInterval(timerRef.current);
        let score = 0;
        shuffledQuestions.forEach(q => { if (answers[q.id] === q.correctAnswer) score++; });
        const passed = score >= exam.passThreshold;
        saveExamResult(exam.id, score, passed, shuffledQuestions, answers);
        setIsFinished(true);
        window.scrollTo(0, 0);
    };

    // ── Results screen ────────────────────────────────────────
    if (isFinished) {
        let score = 0;
        exam.questions.forEach(q => { if (answers[q.id] === q.correctAnswer) score++; });
        const passed = score >= exam.passThreshold;
        const pct = Math.round((score / exam.questions.length) * 100);

        // ── 5 Official handbook chapters ──────────────────────────
        const CHAPTERS = [
            { key: 'ch1', label: 'Chapter 1', title: 'The Values and Principles of the UK', topics: ['values'], emoji: '⚖️' },
            { key: 'ch2', label: 'Chapter 2', title: 'What is the UK?', topics: ['geography'], emoji: '🗺️' },
            { key: 'ch3', label: 'Chapter 3', title: 'A Long and Illustrious History', topics: ['history_early', 'history_modern', 'science'], emoji: '📜' },
            { key: 'ch4', label: 'Chapter 4', title: 'A Modern, Thriving Society', topics: ['culture', 'traditions', 'sport'], emoji: '🎭' },
            { key: 'ch5', label: 'Chapter 5', title: 'The UK Government, the Law and Your Role', topics: ['government'], emoji: '🏛️' },
        ];

        const chapterStats = CHAPTERS.map(ch => {
            const qs = exam.questions.filter(q => ch.topics.includes(q.topic || ''));
            const correct = qs.filter(q => answers[q.id] === q.correctAnswer).length;
            return { ...ch, total: qs.length, correct, acc: qs.length ? Math.round((correct / qs.length) * 100) : null };
        });
        const chaptersFocused = chapterStats.filter(c => c.total > 0 && c.acc < 75).sort((a, b) => a.acc - b.acc);

        // ── Fine-grained topic breakdown ─────────────────────────
        const topicMap = {};
        exam.questions.forEach(q => {
            const t = q.topic || 'general';
            if (!topicMap[t]) topicMap[t] = { label: t, correct: 0, total: 0 };
            topicMap[t].total++;
            if (answers[q.id] === q.correctAnswer) topicMap[t].correct++;
        });
        const topicBreakdown = Object.values(topicMap).sort((a, b) => (a.correct / a.total) - (b.correct / b.total));

        const TOPIC_LABELS = {
            values: 'Values & Principles', geography: 'UK Geography',
            history_early: 'Early History', history_modern: 'Modern History',
            government: 'Government & Law', culture: 'Arts & Culture',
            traditions: 'Traditions & Festivals', sport: 'Sport', science: 'Science & Invention',
        };

        return (
            <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', maxWidth: '700px' }}>
                {/* Score card */}
                <div className="glass-panel" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    <div style={{
                        width: 96, height: 96, borderRadius: '50%', margin: '0 auto var(--space-lg)',
                        background: passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        border: '3px solid ' + (passed ? 'var(--success)' : 'var(--danger)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Award size={48} color={passed ? 'var(--success)' : 'var(--danger)'} />
                    </div>
                    <h2 style={{ fontSize: '2.2rem', marginBottom: 'var(--space-xs)' }}>{passed ? '🎉 You Passed!' : 'Keep Practicing'}</h2>
                    <div style={{ fontSize: '4.5rem', fontWeight: 900, color: passed ? 'var(--success)' : 'var(--danger)', lineHeight: 1, marginBottom: 'var(--space-xs)' }}>
                        {pct}%
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                        <strong style={{ color: 'white' }}>{score} / {exam.questions.length}</strong> correct · Pass mark: 18/24 (75%)
                    </p>
                    {mode === 'timed' && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
                            Time used: {EXAM_MINUTES}m – {Math.floor(secondsLeft / 60)}m {secondsLeft % 60}s remaining
                        </p>
                    )}
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <div className="progress-container" style={{ height: 12 }}>
                            <div className="progress-bar" style={{ width: pct + '%', background: passed ? 'var(--success)' : 'var(--danger)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>0%</span><span style={{ color: 'var(--warning)' }}>75% pass mark</span><span>100%</span>
                        </div>
                    </div>
                    <div className="flex gap-md justify-center" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
                        <button className="btn btn-secondary" onClick={() => navigate('/exams')}>All Exams</button>
                        <button className="btn btn-primary" onClick={() => { setAnswers({}); setIsFinished(false); setCurrentIndex(0); setSecondsLeft(EXAM_MINUTES * 60); setMode(null); }}>
                            <RotateCcw size={16} /> Retry
                        </button>
                    </div>
                </div>

                {/* ── 5-Chapter Handbook Breakdown ── */}
                <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-xs)', fontSize: '1.1rem' }}>
                        <BookOpen size={18} color="var(--accent-primary)" /> Official Handbook Chapter Breakdown
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 'var(--space-lg)' }}>
                        The real test draws randomly from all chapters. This exam contained questions from these chapters:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {chapterStats.map(ch => {
                            if (ch.total === 0) return (
                                <div key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.4 }}>
                                    <span style={{ fontSize: '1.1rem' }}>{ch.emoji}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>{ch.label}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{ch.title} — no questions in this exam</div>
                                    </div>
                                </div>
                            );
                            const color = ch.acc >= 75 ? 'var(--success)' : ch.acc >= 50 ? 'var(--warning)' : 'var(--danger)';
                            const badge = ch.acc >= 75 ? '✓ Good' : ch.acc >= 50 ? '⚠ Review' : '✗ Focus';
                            return (
                                <div key={ch.key}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: '1.1rem' }}>{ch.emoji}</span>
                                            <div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ch.label}</div>
                                                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{ch.title}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                            <span style={{ fontSize: '0.78rem', color, fontWeight: 700, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 999, border: `1px solid ${color}` }}>{badge}</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>
                                                {ch.correct}/{ch.total} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({ch.acc}%)</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: 99, width: ch.acc + '%', background: color, transition: 'width 1.2s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {chaptersFocused.length > 0 && (
                        <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 6 }}>📚 Chapters to revise before your next attempt:</p>
                            {chaptersFocused.map(ch => (
                                <p key={ch.key} style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: '4px 0' }}>
                                    {ch.emoji} <strong style={{ color: 'white' }}>{ch.label} — {ch.title}</strong> ({ch.acc}%) · {ch.total - ch.correct} wrong out of {ch.total} questions
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Fine-grained topic breakdown ── */}
                <div className="glass-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)', fontSize: '1.1rem' }}>
                        <BarChart2 size={18} color="var(--accent-primary)" /> Topic Breakdown
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {topicBreakdown.map(t => {
                            const acc = Math.round((t.correct / t.total) * 100);
                            const color = acc >= 75 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--danger)';
                            return (
                                <div key={t.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{TOPIC_LABELS[t.label] || t.label}</span>
                                        <span style={{ color, fontWeight: 700 }}>{t.correct}/{t.total} ({acc}%)</span>
                                    </div>
                                    <div className="progress-container" style={{ height: 6 }}>
                                        <div className="progress-bar" style={{ width: acc + '%', background: color, transition: 'width 1s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }


    // ── Exam in progress ──────────────────────────────────────
    const currentQ = shuffledQuestions[currentIndex];
    const progressPercent = (currentIndex / shuffledQuestions.length) * 100;
    const hasAnswered = !!answers[currentQ.id];

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0', maxWidth: '800px' }}>
            {/* Top bar */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ padding: 'var(--space-xs) var(--space-md)', gap: 6 }}>
                    <ArrowLeft size={16} /> Exit
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{exam.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Q {currentIndex + 1} of {shuffledQuestions.length}</div>
                </div>
                <TimerBadge seconds={secondsLeft} timed={mode === 'timed'} />
            </div>

            {/* Progress bar */}
            <div className="progress-container" style={{ marginBottom: 'var(--space-xl)', height: 5 }}>
                <div className="progress-bar" style={{ width: progressPercent + '%' }} />
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
                        const isSelected = answers[currentQ.id] === opt;
                        const isCorrect = opt === currentQ.correctAnswer;
                        let borderColor = 'rgba(255,255,255,0.1)', bgColor = 'rgba(255,255,255,0.04)';
                        let labelBg = 'rgba(255,255,255,0.1)', labelColor = 'var(--text-muted)', icon = null;

                        if (hasAnswered) {
                            if (isCorrect) {
                                borderColor = 'var(--success)'; bgColor = 'rgba(16,185,129,0.12)';
                                labelBg = 'rgba(16,185,129,0.3)'; labelColor = 'var(--success)';
                                icon = <CheckCircle size={20} color="var(--success)" />;
                            } else if (isSelected) {
                                borderColor = 'var(--danger)'; bgColor = 'rgba(239,68,68,0.12)';
                                labelBg = 'rgba(239,68,68,0.3)'; labelColor = 'var(--danger)';
                                icon = <XCircle size={20} color="var(--danger)" />;
                            }
                        } else if (isSelected) {
                            borderColor = 'var(--accent-primary)'; bgColor = 'rgba(59,130,246,0.12)';
                            labelBg = 'rgba(59,130,246,0.3)'; labelColor = 'var(--accent-primary)';
                        }

                        return (
                            <button key={i}
                                onClick={() => handleSelect(currentQ.id, opt)}
                                disabled={hasAnswered}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                                    padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)',
                                    border: '2px solid ' + borderColor, background: bgColor,
                                    color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500,
                                    textAlign: 'left', cursor: hasAnswered ? 'default' : 'pointer',
                                    transition: 'all 0.15s ease', fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => { if (!hasAnswered) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                onMouseLeave={e => { if (!hasAnswered && !isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                            >
                                <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: labelBg, color: labelColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, transition: 'all 0.15s' }}>
                                    {OPTION_LABELS[i]}
                                </span>
                                <span style={{ flex: 1 }}>{opt}</span>
                                {icon}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                {hasAnswered && (
                    <div className="fade-in" style={{ padding: 'var(--space-md) var(--space-lg)', background: 'rgba(59,130,246,0.07)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 'var(--space-lg)' }}>
                        <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: 4, fontSize: '0.82rem' }}>💡 Explanation</strong>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{currentQ.explanation}</span>
                    </div>
                )}

                {/* Nav */}
                <div className="flex justify-between items-center" style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
                    <button className="btn btn-secondary" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0} style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}>
                        ← Previous
                    </button>
                    <button className="btn btn-primary" onClick={handleNext} disabled={!hasAnswered} style={{ opacity: !hasAnswered ? 0.4 : 1 }}>
                        {currentIndex === shuffledQuestions.length - 1 ? '🏁 Finish Exam' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
