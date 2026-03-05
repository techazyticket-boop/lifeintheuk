// ============================================================
// NETLIFY FUNCTION: validateExam
// Server-side exam score calculation & storage
// POST /api/validateExam
// Body: { examId, answers: { questionId: selectedOriginalIndex }, userId }
// ============================================================

import { createClient } from '@supabase/supabase-js';

// Question bank (server-side copy for validation)
// In production, this would be in a shared module or fetched from DB
import { questionBank } from '../../src/data/questionBank.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
}

// Deterministic seeded shuffle (must match client)
function seededShuffle(array, seed) {
    const arr = [...array];
    let s = seed;
    const rand = () => { const x = Math.sin(s++) * 10000; return x - Math.floor(x); };
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateExamQuestions(examId) {
    if (String(examId).startsWith('free-')) {
        const seed = parseInt(examId.replace('free-', ''), 10);
        const shuffler = (arr, seed) => seededShuffle(arr, seed);
        const indices = questionBank.map((_, i) => i);
        const shuffled = shuffler(indices, 42); // match client
        return shuffled.slice(0, 24).map((origIdx, i) => {
            const q = questionBank[origIdx];
            return {
                id: `free-q-${i}`,
                correctIndex: q.correctIndex,
                topic: q.topic,
                explanation: q.e,
                opts: q.opts,
            };
        });
    }

    if (String(examId).startsWith('chap-')) {
        const mapping = {
            'chap-1': ['values'],
            'chap-2': ['geography'],
            'chap-3': ['history_early', 'history_modern', 'science'],
            'chap-4': ['culture', 'traditions', 'sport'],
            'chap-5': ['government']
        };
        const topics = mapping[examId];
        if (!topics) return null;
        const chapQs = questionBank.filter(q => topics.includes(q.topic));
        const shuffled = seededShuffle(chapQs, 12345);
        return shuffled.slice(0, 24).map((q, i) => ({
            id: `cq-${examId}-${i}`,
            correctIndex: q.correctIndex,
            topic: q.topic,
            explanation: q.e,
            opts: q.opts,
        }));
    }

    const numericId = parseInt(examId, 10);
    if (isNaN(numericId) || numericId < 1 || numericId > 30) return null;
    const seed = numericId * 997 + 13;
    const shuffled = seededShuffle(questionBank, seed);
    return shuffled.slice(0, 24).map((q, i) => ({
        id: `q-${examId}-${i}`,
        correctIndex: q.correctIndex,
        topic: q.topic,
        explanation: q.e,
        opts: q.opts,
    }));
}

function generateResultHash(examId, score, answers) {
    const payload = `${examId}:${score}:${JSON.stringify(answers)}:passbrita_salt_2026`;
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
        const char = payload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { examId, answers, confidences, durationSeconds, userId } = JSON.parse(event.body);

        if (!examId || !answers) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing examId or answers' }) };
        }

        const questions = generateExamQuestions(examId);
        if (!questions) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid examId' }) };
        }

        let score = 0;
        const topicBreakdown = {};
        const results = [];

        questions.forEach((q, i) => {
            const topic = q.topic || 'general';
            if (!topicBreakdown[topic]) topicBreakdown[topic] = { correct: 0, total: 0 };
            topicBreakdown[topic].total++;

            // Client should send the question id correctly. E.g. 'free-q-12' or 'q-1-0'
            const userAnswer = answers[q.id] !== undefined ? answers[q.id] : answers[i];
            const isCorrect = userAnswer !== undefined && userAnswer !== null && userAnswer === q.correctIndex;

            if (isCorrect) {
                score++;
                topicBreakdown[topic].correct++;
            }

            results.push({
                questionId: q.id,
                correctIndex: q.correctIndex,
                selectedIndex: userAnswer,
                isCorrect,
                explanation: q.explanation,
                topic: q.topic
            });
        });

        const totalQuestions = questions.length;
        const passed = score >= Math.max(1, Math.floor(questions.length * 0.75));
        const percentage = Math.round((score / totalQuestions) * 100);
        const hash = generateResultHash(examId, score, answers);

        let isValidForGuarantee = true;
        let invalidReason = null;

        // Anti-cheat checks
        const duration = parseInt(durationSeconds) || 0;
        if (duration < 600) { // < 10 minutes
            // Wait, free exams or chapter exams shouldn't be held strictly to 10 minutes for guarantee,
            // but the guarantee only cares about regular exams anyway. Let's flag everything under 10m.
            isValidForGuarantee = false;
            invalidReason = 'Exam completed too quickly (< 10 minutes). Minimum time per exam is 10 minutes.';
        } else if (duration < (totalQuestions * 10)) { // < 10 seconds per question on average
            isValidForGuarantee = false;
            invalidReason = 'Average time per question is suspiciously low (< 10 seconds).';
        }

        // Confidence anomaly check (High score, low confidence, fast)
        let lowConfidenceCount = 0;
        if (confidences) {
            Object.values(confidences).forEach(val => {
                if (val === 'low') lowConfidenceCount++;
            });
            if (percentage >= 85 && lowConfidenceCount > (totalQuestions / 2) && duration < 900) {
                isValidForGuarantee = false;
                invalidReason = 'Suspicious behaviour detected: High score with predominantly low confidence and fast completion time.';
            }
        }


        // Store in Supabase if we have credentials and a userId
        const supabase = createSupabaseAdmin();
        let stored = false;

        if (supabase && userId) {
            const { error } = await supabase.from('exam_attempts').insert({
                user_id: userId,
                exam_id: String(examId),
                score,
                total_questions: totalQuestions,
                passed,
                topic_breakdown: topicBreakdown,
                integrity_hash: hash,
                duration_seconds: duration,
                is_valid_for_guarantee: isValidForGuarantee,
                confidence_breakdown: confidences || {},
                invalid_reason: invalidReason,
            });

            if (error) {
                console.error('Supabase insert error:', error);
            } else {
                stored = true;
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                score,
                totalQuestions,
                passed,
                percentage,
                topicBreakdown,
                results,
                hash,
                stored,
                isValidForGuarantee,
                invalidReason,
            }),
        };
    } catch (err) {
        console.error('validateExam error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
}
