import { useState, useEffect } from 'react';

const STORAGE_KEY = 'life_in_uk_progress';

const TOPIC_LABELS = {
    values: 'Values & Principles',
    geography: 'UK Geography',
    history_early: 'Early History',
    history_modern: 'Modern History',
    government: 'Government & Law',
    culture: 'Arts & Culture',
    traditions: 'Traditions & Festivals',
    sport: 'Sport',
    science: 'Science & Invention',
};

const defaultState = {
    isPremium: false,
    completedChapters: [],
    examResults: {},     // { examId: { score, passed, date, topicScores: { topic: { correct, total } } } }
    totalQuestions: 0,
    totalCorrect: 0,
    // Guarantee data
    examDate: null,                    // ISO date string of user's official test
    milestonesCompletedAt: null,       // ISO timestamp when all milestones were first met
    guaranteeClaimSubmitted: false,    // true after user submits claim
    guaranteeClaimApproved: false,     // true after admin approves claim
};

export function useProgress() {
    const [progress, setProgress] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? { ...defaultState, ...JSON.parse(stored) } : defaultState;
        } catch (e) {
            return defaultState;
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }, [progress]);

    const unlockPremium = () => setProgress(p => ({ ...p, isPremium: true }));

    const markChapterComplete = (chapterId) => {
        setProgress(p => {
            if (p.completedChapters.includes(chapterId)) return p;
            return { ...p, completedChapters: [...p.completedChapters, chapterId] };
        });
    };

    /**
     * Save exam result with per-topic scoring.
     * @param {number} examId
     * @param {number} score
     * @param {boolean} passed
     * @param {Array} questions - array of { topic, correctAnswer } 
     * @param {Object} answers - { questionId: selectedAnswer }
     */
    const saveExamResult = (examId, score, passed, questions = [], answers = {}) => {
        // Build topic breakdown
        const topicScores = {};
        questions.forEach(q => {
            const topic = q.topic || 'general';
            if (!topicScores[topic]) topicScores[topic] = { correct: 0, total: 0 };
            topicScores[topic].total++;
            if (answers[q.id] === q.correctAnswer) topicScores[topic].correct++;
        });

        setProgress(p => ({
            ...p,
            totalQuestions: (p.totalQuestions || 0) + questions.length,
            totalCorrect: (p.totalCorrect || 0) + score,
            examResults: {
                ...p.examResults,
                [examId]: { score, passed, date: new Date().toISOString(), topicScores },
            },
        }));
    };

    const getPassProbability = () => {
        const results = Object.values(progress.examResults);
        if (results.length === 0) return 0;
        const passes = results.filter(r => r.passed).length;
        const avgScore = results.reduce((acc, r) => acc + r.score, 0) / (results.length * 24);
        const baseWinRate = (passes / results.length) * 100;
        const scoreFactor = avgScore * 100;
        return Math.min(Math.round(baseWinRate * 0.7 + scoreFactor * 0.3), 99);
    };

    /**
     * Returns top N weakest topics sorted by accuracy ascending.
     * Only considers topics that have been encountered.
     */
    const getWeakTopics = (n = 5) => {
        const totals = {}; // topic -> { correct, total }
        Object.values(progress.examResults).forEach(result => {
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
            .slice(0, n);
    };

    /**
     * Returns the average score for the last N exams.
     */
    const getRecentAverage = (n = 5) => {
        const sorted = Object.values(progress.examResults)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, n);
        if (sorted.length === 0) return 0;
        const avg = sorted.reduce((acc, r) => acc + (r.score / 24) * 100, 0) / sorted.length;
        return Math.round(avg);
    };

    /**
     * Returns whether user has completed all 30 mocks with an average ≥ 85% for last 5.
     * Used for Pass Guarantee eligibility check.
     */
    // Set user's official exam date
    const setExamDate = (dateStr) => {
        setProgress(p => ({ ...p, examDate: dateStr }));
    };

    // Mark guarantee claim as submitted
    const setGuaranteeClaimSubmitted = () => {
        setProgress(p => ({ ...p, guaranteeClaimSubmitted: true }));
    };

    // Mark guarantee claim as approved (admin use)
    const setGuaranteeClaimApproved = () => {
        setProgress(p => ({ ...p, guaranteeClaimApproved: true }));
    };

    /**
     * Returns whether user has completed all eligibility milestones:
     * - Active premium
     * - All 30 mocks done
     * - Last 5 average >= 85%
     * Note: no 90-day window restriction.
     */
    const isGuaranteeEligible = () => {
        const taken = Object.keys(progress.examResults).length;
        if (!progress.isPremium) return false;
        if (taken < 30) return false;
        return getRecentAverage(5) >= 85;
    };

    // Track milestones_completed_at automatically when conditions are first met
    const taken = Object.keys(progress.examResults || {}).length;
    useEffect(() => {
        if (
            progress.isPremium &&
            taken >= 30 &&
            getRecentAverage(5) >= 85 &&
            !progress.milestonesCompletedAt
        ) {
            setProgress(p => ({ ...p, milestonesCompletedAt: new Date().toISOString() }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress.isPremium, taken, progress.milestonesCompletedAt]);

    return {
        progress,
        unlockPremium,
        markChapterComplete,
        saveExamResult,
        getPassProbability,
        getWeakTopics,
        getRecentAverage,
        isGuaranteeEligible,
        setExamDate,
        setGuaranteeClaimSubmitted,
        setGuaranteeClaimApproved,
        TOPIC_LABELS,
    };
}
