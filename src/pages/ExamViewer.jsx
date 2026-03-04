import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockExams, chapterExams, questionBank } from '../data/mockExams';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../context/AuthContext';
import {
    createSessionShuffler,
    saveExamSession,
    loadExamSession,
    clearExamSession,
    EXAM_CONSTANTS,
} from '../services/examEngine';
import { ArrowLeft, CheckCircle, XCircle, Award, BookOpen, Clock, Zap, RotateCcw, BarChart2, AlertTriangle, TrendingUp, Share2 } from 'lucide-react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const EXAM_MINUTES = EXAM_CONSTANTS.EXAM_DURATION_MINUTES;

// ── Timer display ─────────────────────────────────────────────
function TimerBadge({ seconds, timed }) {
    if (!timed) return (
        <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={14} /> Study Mode
        </span>
    );
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const isLow = seconds < 300;
    const isCritical = seconds < 60;
    return (
        <span style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: isCritical ? '#dc2626' : isLow ? '#ef4444' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: isLow ? '4px 8px' : '0',
            borderRadius: isLow ? 'var(--radius-md)' : '0',
            background: isCritical ? 'rgba(220, 38, 38, 0.2)' : isLow ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            border: isLow ? `1px solid ${isCritical ? 'rgba(220,38,38,0.5)' : 'rgba(239, 68, 68, 0.3)'}` : '1px solid transparent',
            transition: 'all 0.3s ease',
            animation: isCritical ? 'pulse 1s infinite' : 'none',
        }}>
            <Clock size={14} color={isCritical ? '#dc2626' : isLow ? '#ef4444' : 'var(--text-muted)'} />
            {m}:{s.toString().padStart(2, '0')}
        </span>
    );
}

export default function ExamViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { progress, saveExamResult, getStudyRecs, getPassProbability, getRecentAverage } = useProgress();
    const { user } = useAuth();

    const isChapterExam = String(id).startsWith('chap-');

    const exam = useMemo(() => {
        if (isChapterExam) {
            return chapterExams.find(c => c.id === id);
        }
        return mockExams.find(e => e.id === Number(id));
    }, [id, isChapterExam]);

    const isPremium = progress.isPremium || (user && user.isPremium);

    // ── Session persistence (anti-cheat: survives refresh) ────
    const [mode, setMode] = useState('timed');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isFinished, setIsFinished] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(EXAM_MINUTES * 60);
    const timerRef = useRef(null);

    // One random seed per session — options re-order on every page load
    const sessionSeed = useRef(Math.floor(Math.random() * 100000));
    const sessionShuffle = useMemo(
        () => createSessionShuffler(sessionSeed.current),
        []
    );

    // ── Restore session on mount (anti-cheat) ────────────────
    const sessionRestored = useRef(false);
    useEffect(() => {
        if (sessionRestored.current || !exam) return;
        sessionRestored.current = true;

        const saved = loadExamSession(exam.id);
        if (saved && !saved.isFinished) {
            setAnswers(saved.answers || {});
            setCurrentIndex(saved.currentIndex || 0);
            setSecondsLeft(saved.secondsLeft || EXAM_MINUTES * 60);
            setMode(saved.mode || 'timed');
            sessionSeed.current = saved.sessionSeed || sessionSeed.current;
        }
    }, [exam]);

    // ── Persist session on every change (anti-cheat) ─────────
    useEffect(() => {
        if (!exam || isFinished) return;
        saveExamSession(exam.id, {
            answers,
            currentIndex,
            secondsLeft,
            mode,
            sessionSeed: sessionSeed.current,
            isFinished: false,
        });
    }, [answers, currentIndex, secondsLeft, mode, exam, isFinished]);

    // Shuffle question ORDER per session (anti-cheat)
    const questionOrder = useMemo(() => {
        if (!exam) return [];
        const indices = exam.questions.map((_, i) => i);
        return sessionShuffle(indices, 999);
    }, [exam, sessionShuffle]);

    // Shuffle options per-session (True/False questions keep TRUE first, FALSE second)
    const shuffledQuestions = useMemo(() => {
        if (!exam) return [];
        return questionOrder.map((origIdx, displayIdx) => {
            const q = exam.questions[origIdx];
            if (q.isTrueFalse) {
                return { ...q, options: ['TRUE', 'FALSE'], _origIdx: origIdx };
            }
            const shuffledOpts = sessionShuffle(q.options.map((opt, i) => ({ opt, origIndex: i })), displayIdx * 37);
            return {
                ...q,
                options: shuffledOpts.map(s => s.opt),
                _optionMapping: shuffledOpts.map(s => s.origIndex), // maps display index -> original index
                _origIdx: origIdx,
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam?.id, sessionShuffle, questionOrder]);

    // Start/stop timer based on mode
    const finishExamRef = useRef(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverResult, setServerResult] = useState(null);

    const finishExam = useCallback(async () => {
        clearInterval(timerRef.current);
        setIsSubmitting(true);
        window.scrollTo(0, 0);

        // Build answers map in original indices
        const mappedAnswers = {};
        shuffledQuestions.forEach(q => {
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
            const res = await fetch('/api/validateExam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: exam.id,
                    answers: mappedAnswers,
                    userId: user?.id || null
                })
            });
            const data = await res.json();

            // Re-map results to local progress cache format
            saveExamResult(exam.id, data.score, data.passed, {
                passed: data.passed,
                score: data.score,
                percentage: data.percentage,
                topicBreakdown: data.topicBreakdown
            });

            clearExamSession(exam.id);
            setServerResult(data);
            setIsFinished(true);
            setIsSubmitting(false);
        } catch (e) {
            console.error('Validation failed', e);
            alert('Failed to submit exam. Please try again or check your connection.');
            setIsSubmitting(false);
        }
    }, [answers, exam, shuffledQuestions, saveExamResult, user]);

    finishExamRef.current = finishExam;

    useEffect(() => {
        if (mode !== 'timed' || isFinished) return;
        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    finishExamRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [mode, isFinished]);

    useEffect(() => { window.scrollTo(0, 0); }, [currentIndex]);

    if (!exam) return <div className="container" style={{ padding: 'var(--space-2xl) 0' }}><p>Exam Not Found</p></div>;
    if (exam.isPremium && !isPremium) { navigate('/pricing'); return null; }

    const handleSelect = (questionId, displayIndex) => {
        if (answers[questionId] !== undefined) return;
        setAnswers(prev => ({ ...prev, [questionId]: displayIndex }));
    };

    const handleNext = () => {
        if (currentIndex < shuffledQuestions.length - 1) {
            setCurrentIndex(p => p + 1);
        } else {
            finishExam();
        }
    };

    if (isSubmitting) {
        return (
            <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>
                <div style={{ marginBottom: 'var(--space-lg)', display: 'inline-flex', justifyContent: 'center', width: 48, height: 48, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <h2>Scoring Your Exam...</h2>
            </div>
        );
    }

    // ── Results screen ────────────────────────────────────────
    if (isFinished && serverResult) {
        const { score, percentage: pct, passed, topicBreakdown } = serverResult;

        // ── 5 Official handbook chapters ──────────────────────────
        const CHAPTERS = [
            { key: 'ch1', label: 'Chapter 1', title: 'The Values and Principles of the UK', topics: ['values'], emoji: '⚖️' },
            { key: 'ch2', label: 'Chapter 2', title: 'What is the UK?', topics: ['geography'], emoji: '🗺️' },
            { key: 'ch3', label: 'Chapter 3', title: 'A Long and Illustrious History', topics: ['history_early', 'history_modern', 'science'], emoji: '📜' },
            { key: 'ch4', label: 'Chapter 4', title: 'A Modern, Thriving Society', topics: ['culture', 'traditions', 'sport'], emoji: '🎭' },
            { key: 'ch5', label: 'Chapter 5', title: 'The UK Government, the Law and Your Role', topics: ['government'], emoji: '🏛️' },
        ];

        const chapterStats = CHAPTERS.map(ch => {
            let correct = 0;
            let total = 0;
            ch.topics.forEach(t => {
                if (topicBreakdown[t]) {
                    correct += topicBreakdown[t].correct;
                    total += topicBreakdown[t].total;
                }
            });
            return {
                ...ch,
                total,
                correct,
                acc: total > 0 ? Math.round((correct / total) * 100) : null
            };
        });
        const chaptersFocused = chapterStats.filter(c => c.total > 0 && c.acc < 75).sort((a, b) => a.acc - b.acc);

        // ── Fine-grained topic breakdown ─────────────────────────
        const TOPIC_LABELS = {
            values: 'Values & Principles', geography: 'UK Geography',
            history_early: 'Early History', history_modern: 'Modern History',
            government: 'Government & Law', culture: 'Arts & Culture',
            traditions: 'Traditions & Festivals', sport: 'Sport', science: 'Science & Invention',
        };
        const topicBreakdownArr = Object.entries(topicBreakdown).map(([k, v]) => ({ label: k, correct: v.correct, total: v.total }))
            .sort((a, b) => (a.correct / a.total) - (b.correct / b.total));

        // ── AI Study Recommendations ─────────────────────────────
        const studyRecs = getStudyRecs();

        return (
            <div className="container slide-up" style={{ padding: 'var(--space-2xl) 0', maxWidth: '700px' }}>
                {
                    (!isPremium && String(exam.id) === '3') && (
                        <div style={{
                            padding: 'var(--space-2xl)',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
                            border: '1px solid rgba(139,92,246,0.5)',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'center',
                            marginBottom: 'var(--space-2xl)'
                        }}>
                            <Star size={48} color="var(--accent-secondary)" style={{ margin: '0 auto var(--space-md)' }} />
                            <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>You've completed all free mock exams.</h2>

                            <div style={{
                                display: 'inline-block', background: 'rgba(0,0,0,0.3)', padding: 'var(--space-md) var(--space-xl)',
                                borderRadius: 'var(--radius-md)', margin: 'var(--space-md) auto var(--space-lg)'
                            }}>
                                <div style={{ fontSize: '1.2rem', marginBottom: 8, color: 'var(--text-secondary)' }}>
                                    Your average score: <strong style={{ color: 'white' }}>{getRecentAverage(5)}%</strong>
                                </div>
                                <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                                    Estimated pass probability: <strong style={{ color: getPassProbability() >= 75 ? 'var(--success)' : 'var(--warning)' }}>{getPassProbability()}%</strong>
                                </div>
                            </div>

                            <p style={{ color: 'var(--warning)', fontSize: '1.1rem', marginBottom: 'var(--space-xl)', fontWeight: 600 }}>
                                Most people scoring below 75% fail the real Life in the UK test.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: 'var(--space-md)', textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} color="var(--success)" /> 30 full mock exams</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} color="var(--success)" /> Weak topic analysis</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} color="var(--success)" /> Pass probability tracking</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} color="var(--success)" /> Pass guarantee eligibility</div>
                            </div>

                            <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem' }} onClick={() => navigate('/pricing')}>
                                Unlock Full Course
                            </button>
                        </div>
                    )
                }

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
                        <strong style={{ color: 'white' }}>{score} / {shuffledQuestions.length}</strong> correct · Pass mark: 18/24 (75%)
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
                    {/* Share Score */}
                    <button className="btn btn-secondary" style={{ gap: 8, marginBottom: 'var(--space-lg)' }} onClick={() => {
                        const text = `🇬🇧 I scored ${score}/${shuffledQuestions.length} (${pct}%) on the Life in the UK mock exam!\nCan you beat me? Try it free:`;
                        const url = window.location.origin + '/life-in-the-uk-practice-test';
                        if (navigator.share) {
                            navigator.share({ title: 'Life in the UK Practice Test', text, url }).catch(() => { });
                        } else {
                            navigator.clipboard.writeText(`${text}\n${url}`).then(() => alert('Score copied to clipboard!')).catch(() => { });
                        }
                    }}>
                        <Share2 size={16} /> Share Your Score
                    </button>

                    <div className="flex gap-md justify-center" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
                        <button className="btn btn-secondary" onClick={() => navigate('/exams')}>All Exams</button>
                        <button className="btn btn-primary" onClick={() => {
                            clearExamSession(exam.id);
                            setAnswers({});
                            setIsFinished(false);
                            setCurrentIndex(0);
                            setSecondsLeft(EXAM_MINUTES * 60);
                            sessionSeed.current = Math.floor(Math.random() * 100000);
                        }}>
                            <RotateCcw size={16} /> Retry
                        </button>
                    </div>
                </div>

                {/* ── AI Study Recommendations ── */}
                {studyRecs.recommendations.length > 0 && (
                    <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', borderColor: 'rgba(139,92,246,0.3)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-xs)', fontSize: '1.1rem' }}>
                            <TrendingUp size={18} color="var(--accent-secondary)" /> AI Study Recommendations
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
                )}

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
                        {topicBreakdownArr.map(t => {
                            const acc = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
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
    const answeredPercent = (Object.keys(answers).length / shuffledQuestions.length) * 100;

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
            <div style={{ marginBottom: 'var(--space-md)', position: 'relative' }}>
                <div className="progress-container" style={{ height: 5 }}>
                    <div className="progress-bar" style={{ width: progressPercent + '%' }} />
                </div>
                {/* Answered indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>{Object.keys(answers).length}/{shuffledQuestions.length} answered</span>
                    <span>{Math.round(answeredPercent)}% complete</span>
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
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                            >
                                <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: labelBg, color: labelColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, transition: 'all 0.15s' }}>
                                    {OPTION_LABELS[i]}
                                </span>
                                <span style={{ flex: 1 }}>{opt}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Nav — Next disabled until answered (locked navigation) */}
                <div className="flex justify-between items-center" style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
                    <button className="btn btn-secondary" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0 || isSubmitting} style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}>
                        ← Previous
                    </button>
                    <button className="btn btn-primary" onClick={handleNext} disabled={answers[currentQ.id] === undefined || isSubmitting} style={{ opacity: answers[currentQ.id] === undefined ? 0.4 : 1 }}>
                        {currentIndex === shuffledQuestions.length - 1 ? '🏁 Submit Exam' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}
