import { useState, useEffect, useCallback } from 'react';
import { supabase, isMockMode } from '../lib/supabase';
import {
    calculatePassProbability,
    calculateRecentAverage,
    calculateWeakTopics,
    calculateTopicMastery,
    calculateStreak,
    checkGuaranteeEligibility,
    generateResultHash,
    getStudyRecommendations,
    EXAM_CONSTANTS,
} from '../services/examEngine.js';
import { TOPIC_LABELS } from '../data/mockExams';

const STORAGE_KEY = 'life_in_uk_progress';

const defaultState = {
    isPremium: false,
    completedChapters: [],
    examResults: {},     // { examId: { score, passed, date, topicScores, hash, attempt } }
    totalQuestions: 0,
    totalCorrect: 0,
    examDate: null,
    milestonesCompletedAt: null,
    guaranteeClaimSubmitted: false,
    guaranteeClaimApproved: false,
    examAttempts: {},
    lastActivityDate: null,
};

export function useProgress() {
    const [progress, setProgress] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return defaultState;

            const parsed = JSON.parse(stored);

            // SECURITY/UX: Reset guest progress if it's older than 6 hours
            // This prevents "stale" progress from showing for non-logged-in users
            if (parsed.lastActivityDate) {
                const lastUsed = new Date(parsed.lastActivityDate).getTime();
                const now = new Date().getTime();
                const SIX_HOURS = 6 * 60 * 60 * 1000;

                if (now - lastUsed > SIX_HOURS) {
                    return defaultState;
                }
            }

            return { ...defaultState, ...parsed };
        } catch (e) {
            return defaultState;
        }
    });

    const [supabaseUser, setSupabaseUser] = useState(null);

    // Listen for Supabase auth changes to get userId
    useEffect(() => {
        if (isMockMode || !supabase) return;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setSupabaseUser(session.user);
                loadProgressFromSupabase(session.user.id, session.user.user_metadata);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setSupabaseUser(session.user);
                loadProgressFromSupabase(session.user.id, session.user.user_metadata);
            } else {
                setSupabaseUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load historical results from Supabase
    const loadProgressFromSupabase = useCallback(async (userId, userMetadata = {}) => {
        if (isMockMode || !supabase) return;

        try {
            const { data: attempts } = await supabase
                .from('exam_attempts')
                .select('*')
                .eq('user_id', userId)
                .order('completed_at', { ascending: true });

            if (attempts && attempts.length > 0) {
                const examResults = {};
                const examAttempts = {};
                let totalQuestions = 0;
                let totalCorrect = 0;

                attempts.forEach(a => {
                    const attempt = (examAttempts[a.exam_id] || 0) + 1;
                    examAttempts[a.exam_id] = attempt;

                    examResults[a.exam_id] = {
                        score: a.score,
                        passed: a.passed,
                        date: a.completed_at,
                        topicScores: a.topic_breakdown || {},
                        hash: a.integrity_hash,
                        attempt,
                    };

                    totalQuestions += a.total_questions;
                    totalCorrect += a.score;
                });

                setProgress(prev => ({
                    ...prev,
                    examResults,
                    examAttempts,
                    totalQuestions,
                    totalCorrect,
                    lastActivityDate: attempts[attempts.length - 1]?.completed_at,
                }));
            }

            // 2. Clear progress and load user premium status — check BOTH tables
            const { data: userRecord } = await supabase
                .from('users')
                .select('is_premium, guarantee_claimed')
                .eq('id', userId)
                .maybeSingle();

            // Check for active Stripe subscription
            const { data: activeSub } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('user_id', userId)
                .in('status', ['active', 'trialing'])
                .limit(1)
                .maybeSingle();

            const hasActiveStripeSubscription = activeSub?.status === 'active' || activeSub?.status === 'trialing';

            const ADMIN_EMAIL = 'techazyticket@gmail.com';
            const isAdmin = supabaseUser?.email && supabaseUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

            setProgress(prev => ({
                ...prev,
                isPremium: hasActiveStripeSubscription || userRecord?.is_premium || isAdmin || prev.isPremium,
                guaranteeClaimSubmitted: userRecord?.guarantee_claimed || prev.guaranteeClaimSubmitted,
                completedChapters: userMetadata.completedChapters || prev.completedChapters,
                examDate: userMetadata.examDate || prev.examDate,
                milestonesCompletedAt: userMetadata.milestonesCompletedAt || prev.milestonesCompletedAt,
            }));
        } catch (err) {
            console.warn('Failed to load progress from Supabase:', err);
        }
    }, []);

    // Persist to localStorage as fallback
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }, [progress]);

    const unlockPremium = () => setProgress(p => ({ ...p, isPremium: true }));

    const markChapterComplete = (chapterId) => {
        setProgress(p => {
            if (p.completedChapters.includes(chapterId)) return p;
            const newCompletedChapters = [...p.completedChapters, chapterId];
            if (supabaseUser) supabase.auth.updateUser({ data: { completedChapters: newCompletedChapters } });
            return { ...p, completedChapters: newCompletedChapters };
        });
    };

    /**
     * Save exam result directly to the local cache after it was validated by the server.
     */
    const saveExamResult = (examId, score, passed, serverData = null) => {
        // Fallbacks for testing
        const topicScores = serverData?.topicBreakdown || {};
        const hash = serverData?.hash || generateResultHash(examId, score, {});

        // Update local state
        setProgress(p => {
            const prevAttempts = p.examAttempts || {};
            const attempt = (prevAttempts[examId] || 0) + 1;

            return {
                ...p,
                totalQuestions: (p.totalQuestions || 0) + questions.length,
                totalCorrect: (p.totalCorrect || 0) + score,
                lastActivityDate: new Date().toISOString(),
                examAttempts: { ...prevAttempts, [examId]: attempt },
                examResults: {
                    ...p.examResults,
                    [examId]: {
                        score,
                        passed,
                        date: new Date().toISOString(),
                        topicScores,
                        hash,
                        attempt,
                    },
                },
            };
        });

        return { score, passed };
    };

    // ── Derived metrics ──────────────────────────────────────
    const getPassProbability = () => calculatePassProbability(progress.examResults || {});
    const getWeakTopics = (n = 5) => calculateWeakTopics(progress.examResults || {}, n);
    const getTopicMastery = () => calculateTopicMastery(progress.examResults || {});
    const getRecentAverage = (n = 5) => calculateRecentAverage(progress.examResults || {}, n);
    const getStreak = () => calculateStreak(progress.examResults || {});
    const getStudyRecs = () => getStudyRecommendations(progress.examResults || {});

    // ── Guarantee ────────────────────────────────────────────
    const setExamDate = (dateStr) => {
        if (supabaseUser) supabase.auth.updateUser({ data: { examDate: dateStr } });
        setProgress(p => ({ ...p, examDate: dateStr }));
    };

    const setGuaranteeClaimSubmitted = () => {
        setProgress(p => ({ ...p, guaranteeClaimSubmitted: true }));
    };

    const setGuaranteeClaimApproved = () => {
        setProgress(p => ({ ...p, guaranteeClaimApproved: true }));
    };

    const isGuaranteeEligible = () => {
        const result = checkGuaranteeEligibility(progress);
        return result.eligible;
    };

    const getGuaranteeStatus = () => checkGuaranteeEligibility(progress);

    /**
     * Submit guarantee claim via server-side validation
     */
    const submitGuaranteeClaim = async ({ examDate, proofUrl }) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, reason: 'Not logged in' };

        try {
            const res = await fetch('/.netlify/functions/validateGuarantee', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    examDate: examDate || progress.examDate,
                    proofUrl,
                }),
            });

            const result = await res.json();

            if (result.eligible && result.claimSubmitted) {
                setGuaranteeClaimSubmitted();
                return { success: true, message: result.message };
            }

            return { success: false, reason: result.reason || 'Not eligible' };
        } catch (err) {
            console.warn('Guarantee validation failed:', err);
            return { success: false, reason: 'Server error. Please try again.' };
        }
    };

    // ── Milestones auto-track ────────────────────────────────
    const taken = Object.keys(progress.examResults || {}).length;
    useEffect(() => {
        if (
            progress.isPremium &&
            taken >= EXAM_CONSTANTS.GUARANTEE_REQUIRED_MOCKS &&
            calculateRecentAverage(progress.examResults || {}, EXAM_CONSTANTS.GUARANTEE_RECENT_COUNT) >= EXAM_CONSTANTS.GUARANTEE_REQUIRED_AVG &&
            !progress.milestonesCompletedAt
        ) {
            const dateStr = new Date().toISOString();
            if (supabaseUser) supabase.auth.updateUser({ data: { milestonesCompletedAt: dateStr } });
            setProgress(p => ({ ...p, milestonesCompletedAt: dateStr }));
        }
    }, [progress.isPremium, taken, progress.milestonesCompletedAt, supabaseUser]);

    // ── Score history for charts ─────────────────────────────
    const getScoreHistory = () => {
        return Object.entries(progress.examResults || {})
            .map(([id, result]) => ({
                examId: id,
                score: result.score,
                percentage: Math.round((result.score / EXAM_CONSTANTS.QUESTIONS_PER_EXAM) * 100),
                passed: result.passed,
                date: result.date,
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    return {
        progress,
        unlockPremium,
        markChapterComplete,
        saveExamResult,
        getPassProbability,
        getWeakTopics,
        getTopicMastery,
        getRecentAverage,
        getStreak,
        getStudyRecs,
        getScoreHistory,
        isGuaranteeEligible,
        getGuaranteeStatus,
        setExamDate,
        setGuaranteeClaimSubmitted,
        setGuaranteeClaimApproved,
        submitGuaranteeClaim,
        TOPIC_LABELS,
        EXAM_CONSTANTS,
    };
}
