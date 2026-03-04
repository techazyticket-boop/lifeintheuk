// ── Constants ────────────────────────────────────────────────
export const EXAM_CONSTANTS = {
    QUESTIONS_PER_EXAM: 24,
    PASS_THRESHOLD: 18,
    PASS_PERCENTAGE: 75,
    EXAM_DURATION_MINUTES: 45,
    TOTAL_EXAMS: 30,
    FREE_EXAMS: 3,
    GUARANTEE_REQUIRED_MOCKS: 30,
    GUARANTEE_REQUIRED_AVG: 85,
    GUARANTEE_RECENT_COUNT: 5,
};

import { TOPIC_LABELS, TOPICS } from '../data/mockExams.js';

// ── Calculate weak topics from exam results ──────────────────
export function calculateWeakTopics(examResults, maxTopics = 5) {
    const totals = {}; // topic -> { correct, total }

    Object.values(examResults).forEach(result => {
        if (!result.topicScores) return;
        Object.entries(result.topicScores).forEach(([topic, scores]) => {
            if (!totals[topic]) totals[topic] = { correct: 0, total: 0 };
            totals[topic].correct += scores.correct;
            totals[topic].total += scores.total;
        });
    });

    return Object.entries(totals)
        .filter(([, s]) => s.total >= 1)
        .map(([topic, s]) => ({
            topic,
            label: TOPIC_LABELS[topic] || topic,
            correct: s.correct,
            total: s.total,
            accuracy: Math.round((s.correct / s.total) * 100),
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, maxTopics);
}

// ── Calculate topic mastery (all topics, for chart) ──────────
export function calculateTopicMastery(examResults) {
    const totals = {};

    TOPICS.forEach(t => {
        totals[t] = { correct: 0, total: 0 };
    });

    Object.values(examResults).forEach(result => {
        if (!result.topicScores) return;
        Object.entries(result.topicScores).forEach(([topic, scores]) => {
            if (!totals[topic]) totals[topic] = { correct: 0, total: 0 };
            totals[topic].correct += scores.correct;
            totals[topic].total += scores.total;
        });
    });

    return TOPICS.map(topic => ({
        topic,
        label: TOPIC_LABELS[topic],
        correct: totals[topic].correct,
        total: totals[topic].total,
        accuracy: totals[topic].total > 0
            ? Math.round((totals[topic].correct / totals[topic].total) * 100)
            : null,
    }));
}

// ── AI Study Recommendations ─────────────────────────────────
export function getStudyRecommendations(examResults) {
    const weakTopics = calculateWeakTopics(examResults, 9);

    if (weakTopics.length === 0) {
        return {
            level: 'none',
            message: 'Complete a mock exam to unlock personalised study recommendations.',
            recommendations: [],
        };
    }

    const avgAccuracy = weakTopics.reduce((s, t) => s + t.accuracy, 0) / weakTopics.length;
    const critical = weakTopics.filter(t => t.accuracy < 50);
    const needsWork = weakTopics.filter(t => t.accuracy >= 50 && t.accuracy < 75);
    const strong = weakTopics.filter(t => t.accuracy >= 75);

    let level, message;
    if (avgAccuracy >= 85) {
        level = 'excellent';
        message = '🏆 Excellent performance across all topics! Focus on maintaining consistency.';
    } else if (avgAccuracy >= 70) {
        level = 'good';
        message = '📈 Good progress! Focus on the weaker areas below to push your score higher.';
    } else if (avgAccuracy >= 50) {
        level = 'developing';
        message = '💪 You\'re getting there. Targeted study in your weak areas will help significantly.';
    } else {
        level = 'needs_focus';
        message = '🎯 Focus on the topics below — regular practice will make a big difference.';
    }

    const recommendations = [];

    critical.forEach(t => {
        const chap = getChapterForTopic(t.topic);
        recommendations.push({
            priority: 'high',
            topic: t.label,
            accuracy: t.accuracy,
            action: `Revise ${chap ? chap.label + ' — ' : ''}${t.label} thoroughly. You scored ${t.accuracy}% — aim for 75%+.`,
            chapter: chap,
        });
    });

    needsWork.forEach(t => {
        const chap = getChapterForTopic(t.topic);
        recommendations.push({
            priority: 'medium',
            topic: t.label,
            accuracy: t.accuracy,
            action: `Review ${t.label} to strengthen from ${t.accuracy}% to 85%+.`,
            chapter: chap,
        });
    });

    strong.forEach(t => {
        recommendations.push({
            priority: 'low',
            topic: t.label,
            accuracy: t.accuracy,
            action: `${t.label} is strong at ${t.accuracy}%. Quick revision to maintain.`,
        });
    });

    return { level, message, recommendations };
}

function getChapterForTopic(topic) {
    const mapping = {
        values: { id: 'chap-1', label: 'Chapter 1' },
        geography: { id: 'chap-2', label: 'Chapter 2' },
        history_early: { id: 'chap-3', label: 'Chapter 3' },
        history_modern: { id: 'chap-3', label: 'Chapter 3' },
        science: { id: 'chap-3', label: 'Chapter 3' },
        culture: { id: 'chap-4', label: 'Chapter 4' },
        traditions: { id: 'chap-4', label: 'Chapter 4' },
        sport: { id: 'chap-4', label: 'Chapter 4' },
        government: { id: 'chap-5', label: 'Chapter 5' },
    };
    return mapping[topic] || null;
}

// ── Pass Probability Calculator ──────────────────────────────
export function calculatePassProbability(examResults) {
    const results = Object.values(examResults).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (results.length === 0) return 0;

    // Base probability: Average of all scores
    let totalScore = 0;
    results.forEach(r => { totalScore += (r.score / EXAM_CONSTANTS.QUESTIONS_PER_EXAM) * 100; });
    let baseProbability = totalScore / results.length;

    // Adjust for trend (last 5 vs previous 5)
    if (results.length >= 3) {
        const recent = results.slice(-3);
        const previous = results.slice(0, -3);
        const recentAvg = recent.reduce((sum, r) => sum + (r.score / EXAM_CONSTANTS.QUESTIONS_PER_EXAM) * 100, 0) / recent.length;

        let prevAvg = baseProbability;
        if (previous.length > 0) {
            prevAvg = previous.reduce((sum, r) => sum + (r.score / EXAM_CONSTANTS.QUESTIONS_PER_EXAM) * 100, 0) / previous.length;
        }

        if (recentAvg > prevAvg) {
            baseProbability += 5; // Reward upward trend
        } else if (recentAvg < prevAvg - 5) {
            baseProbability -= 5; // Penalize downward trend
        }
    }

    // Adjust for consistency and volume (more exams = more confidence)
    if (results.length >= 10) baseProbability += 3;
    if (results.length >= 20) baseProbability += 5;
    if (results.length >= 30) baseProbability += 7;

    return Math.min(Math.round(baseProbability), 99);
}

// ── Recent Average Calculator ────────────────────────────────
export function calculateRecentAverage(examResults, n = 5) {
    const sorted = Object.values(examResults)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, n);
    if (sorted.length === 0) return 0;
    const avg = sorted.reduce((acc, r) => acc + (r.score / EXAM_CONSTANTS.QUESTIONS_PER_EXAM) * 100, 0) / sorted.length;
    return Math.round(avg);
}

// ── Guarantee Eligibility Check ──────────────────────────────
export function checkGuaranteeEligibility(progress) {
    const taken = Object.keys(progress.examResults || {}).length;
    const isPremium = progress.isPremium;
    const recentAvg = calculateRecentAverage(progress.examResults || {}, EXAM_CONSTANTS.GUARANTEE_RECENT_COUNT);

    const checks = {
        hasSubscription: !!isPremium,
        completedMocks: taken >= EXAM_CONSTANTS.GUARANTEE_REQUIRED_MOCKS,
        averageMet: recentAvg >= EXAM_CONSTANTS.GUARANTEE_REQUIRED_AVG,
        examDateSet: !!progress.examDate,
        firstAttempt: !progress.guaranteeClaimSubmitted,
    };

    const eligible = Object.values(checks).every(Boolean);

    return {
        eligible,
        checks,
        taken,
        recentAvg,
    };
}

// ── Streak Calculator ────────────────────────────────────────
export function calculateStreak(examResults) {
    const dates = Object.values(examResults)
        .map(r => {
            const d = new Date(r.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
        .reverse();

    if (dates.length === 0) return 0;

    let streak = 1;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Allow the streak to start from today or yesterday
    const firstDate = dates[0];
    const daysDiff = Math.floor((new Date(todayStr) - new Date(firstDate)) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) return 0; // Streak broken

    for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// ── Session Shuffler (for anti-cheat option randomization) ───
export function createSessionShuffler(sessionSeed) {
    return (arr, extraSeed) => {
        const a = [...arr];
        let s = sessionSeed + extraSeed;
        const rand = () => {
            const x = Math.sin(s++) * 10000;
            return x - Math.floor(x);
        };
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };
}

// ── Exam Session Persistence (anti-cheat, survives refresh) ──
const SESSION_KEY_PREFIX = 'passbrita_exam_session_';

export function saveExamSession(examId, sessionData) {
    try {
        const key = SESSION_KEY_PREFIX + examId;
        localStorage.setItem(key, JSON.stringify({
            ...sessionData,
            savedAt: Date.now(),
        }));
    } catch (e) {
        console.warn('Failed to save exam session:', e);
    }
}

export function loadExamSession(examId) {
    try {
        const key = SESSION_KEY_PREFIX + examId;
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const data = JSON.parse(raw);
        // Session expires after 60 minutes (buffer beyond 45-min exam)
        if (Date.now() - data.savedAt > 60 * 60 * 1000) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

export function clearExamSession(examId) {
    try {
        localStorage.removeItem(SESSION_KEY_PREFIX + examId);
    } catch (e) {
        // ignore
    }
}

// ── Integrity hash for exam results ──────────────────────────
// Simple hash to detect client-side tampering of results
export function generateResultHash(examId, score, answers) {
    const payload = `${examId}:${score}:${JSON.stringify(answers)}:passbrita_salt_2026`;
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
        const char = payload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// ── Validate exam structure (for build-time validation) ──────
export function validateExamStructure(exam) {
    const errors = [];

    if (exam.questions.length !== EXAM_CONSTANTS.QUESTIONS_PER_EXAM) {
        errors.push(`Exam ${exam.id}: has ${exam.questions.length} questions, expected ${EXAM_CONSTANTS.QUESTIONS_PER_EXAM}`);
    }

    exam.questions.forEach((q, i) => {
        if (q.correctIndex === undefined || q.correctIndex === null) {
            errors.push(`Exam ${exam.id}, Q${i}: missing correctIndex`);
        }
        if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
            errors.push(`Exam ${exam.id}, Q${i}: correctIndex ${q.correctIndex} out of bounds (${q.options.length} options)`);
        }
        if (!q.explanation || q.explanation.trim() === '') {
            errors.push(`Exam ${exam.id}, Q${i}: missing explanation`);
        }
        if (!q.topic) {
            errors.push(`Exam ${exam.id}, Q${i}: missing topic`);
        }
    });

    return errors;
}
