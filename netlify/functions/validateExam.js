// ============================================================
// NETLIFY FUNCTION: validateExam
// Server-side exam score calculation & secure session grading
// POST /api/validateExam
// Body: { sessionId, answers: { [questionId]: displayIndex }, confidences, durationSeconds }
// Headers: Authorization
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
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
        const { sessionId, answers, durationSeconds } = JSON.parse(event.body);

        if (!sessionId || !answers) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing sessionId or answers' }) };
        }

        // 1. JWT Authentication (Optional)
        const authHeader = event.headers.authorization;
        let user = null;
        const supabase = createSupabaseAdmin();

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            if (token) {
                const { data: authData, error: authError } = await supabase.auth.getUser(token);
                if (!authError && authData?.user) {
                    user = authData.user;
                }
            }
        }

        // 2. Lookup Session
        let query = supabase.from('exam_sessions').select('*').eq('session_id', sessionId);
        if (user) {
            query = query.eq('user_id', user.id);
        } else {
            query = query.is('user_id', null);
        }
        const { data: sessionData, error: sessionError } = await query.single();

        if (sessionError || !sessionData) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Exam session not found or unauthorized. Sessions cannot be reused.' }) };
        }

        const now = new Date();
        const expiresAt = new Date(sessionData.expires_at);
        if (now > expiresAt) {
            // Delete expired session
            await supabase.from('exam_sessions').delete().eq('session_id', sessionId);
            return { statusCode: 400, body: JSON.stringify({ error: 'Exam session expired' }) };
        }

        const questionMapping = sessionData.question_ids;
        const examId = sessionData.exam_id;

        // Ensure atomic consumption of the session (prevents replay attacks)
        await supabase.from('exam_sessions').delete().eq('session_id', sessionId);

        let score = 0;
        const topicBreakdown = {};
        const results = [];

        const questionIds = Object.keys(questionMapping);
        const totalQuestions = questionIds.length;

        questionIds.forEach((qId) => {
            const mappedObj = questionMapping[qId];
            const topic = mappedObj.topic || 'general';
            if (!topicBreakdown[topic]) topicBreakdown[topic] = { correct: 0, total: 0 };
            topicBreakdown[topic].total++;

            const displayAnswer = answers[qId];
            // Translate display index back to original index
            const origAnswer = displayAnswer !== undefined && displayAnswer !== null ? mappedObj.displayToOrigMap[displayAnswer] : null;

            const isCorrect = origAnswer !== null && origAnswer === mappedObj.correctIndex;

            if (isCorrect) {
                score++;
                topicBreakdown[topic].correct++;
            }

            results.push({
                questionId: qId,
                correctIndex: mappedObj.correctIndex, // Still need to return the original correct index for frontend UI
                selectedIndex: origAnswer,
                isCorrect,
                explanation: mappedObj.explanation,
                topic: mappedObj.topic
            });
        });

        const passed = score >= Math.max(1, Math.floor(totalQuestions * 0.75));
        const percentage = Math.round((score / totalQuestions) * 100);
        const hash = generateResultHash(examId, score, answers);

        let isValidForGuarantee = true;
        let invalidReason = null;
        let fraudScore = 0.0;
        const suspiciousFlags = [];

        // 3. Fraud Detection & Eligibility Validation
        const clientDuration = parseInt(durationSeconds) || 0;
        const physicalDurationSeconds = Math.max(0, Math.floor((now.getTime() - new Date(sessionData.start_time).getTime()) / 1000));
        
        // Take the smaller of the two to prevent spoofing a high duration to bypass spam checks
        const duration = Math.min(clientDuration, physicalDurationSeconds);

        // Spam protection: Minimum 10 minutes total
        if (duration < 600) {
            isValidForGuarantee = false;
            invalidReason = 'Exam completed too quickly (< 10 minutes). Minimum time per exam is 10 minutes.';
            fraudScore += 0.5;
            suspiciousFlags.push('Fast Completion');
        }

        // Fast answer protection: Avg < 8 seconds per question
        if (duration < (totalQuestions * 8)) {
            isValidForGuarantee = false;
            invalidReason = 'Average time per question is suspiciously low (< 8 seconds).';
            fraudScore += 0.8;
            suspiciousFlags.push('Bot-like Speed');
        }



        // 4. Record Attempt securely on Server (Logged-in users only)
        if (user) {
            const { error: insertError } = await supabase.from('exam_attempts').insert({
                user_id: user.id,
                exam_id: String(examId),
                score,
                passed,
                topic_breakdown: topicBreakdown,
                duration_seconds: duration,
                is_valid_for_guarantee: isValidForGuarantee,
                confidence_breakdown: {},
                invalid_reason: invalidReason,
                fraud_score: Math.min(fraudScore, 1.0),
                suspicious_flags: suspiciousFlags
            });

            if (insertError) {
                console.error('Supabase insert error:', insertError);
                return { statusCode: 500, body: JSON.stringify({ error: 'Failed to record exam attempt securely' }) };
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
                isValidForGuarantee,
                invalidReason,
                fraudScore
            }),
        };
    } catch (err) {
        console.error('validateExam error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
}
