import { createClient } from '@supabase/supabase-js';
import { questionBank } from './questionBank.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
}

// Full random shuffle
function randomShuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function selectQuestions(examId) {
    if (!examId) return null;
    const idStr = String(examId);

    if (idStr.startsWith('free-')) {
        // Deterministic for practice tests
        const seed = parseInt(idStr.replace('free-', ''), 10);
        // Simple seeded generator since it's just free mock
        const arr = [...questionBank];
        let s = seed * 42;
        const rand = () => { const x = Math.sin(s++) * 10000; return x - Math.floor(x); };
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.slice(0, 24).map((q, i) => ({ ...q, id: `free-q-${i}` }));
    }

    if (idStr.startsWith('chap-')) {
        const mapping = {
            'chap-1': ['values'],
            'chap-2': ['geography'],
            'chap-3': ['history_early', 'history_modern', 'science'],
            'chap-4': ['culture', 'traditions', 'sport'],
            'chap-5': ['government']
        };
        const topics = mapping[idStr];
        if (!topics) return null;
        const chapQs = questionBank.filter(q => topics.includes(q.topic));
        return randomShuffle(chapQs).slice(0, 24).map((q, i) => ({ ...q, id: `cq-${idStr}-${i}` }));
    }

    // Default mock exams 1 to 30
    const numericId = parseInt(idStr, 10);
    if (isNaN(numericId) || numericId < 1 || numericId > 30) {
        return null;
    }

    // Completely random shuffle for actual mock exams (Anti-extraction)
    return randomShuffle(questionBank).slice(0, 24).map((q, i) => ({ ...q, id: `q-${numericId}-${i}` }));
}

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { examId } = body;

        // 1. JWT Authentication (Optional for exams 1-3)
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

        if (!examId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing examId' }) };

        const numericId = parseInt(examId, 10);
        const isFreeExam = numericId >= 1 && numericId <= 3;

        // 2. Access Control
        if (!isFreeExam) {
            if (!user) {
                return { statusCode: 401, body: JSON.stringify({ error: 'Please log in to take this exam' }) };
            }

            // Mock exams 4-30 require premium
            if (!isNaN(numericId) && numericId > 3) {
                const { data: userData } = await supabase.from('users').select('is_premium').eq('id', user.id).single();
                if (!userData || !userData.is_premium) {
                    return { statusCode: 403, body: JSON.stringify({ error: 'Premium required for this exam' }) };
                }
            }
        }

        // 3. Cooldown Check (Logged-in users only)
        if (user) {
            const { data: recentExams } = await supabase
                .from('exam_attempts')
                .select('completed_at')
                .eq('user_id', user.id)
                .order('completed_at', { ascending: false })
                .limit(1);

            if (recentExams && recentExams.length > 0) {
                const lastAttemptTime = new Date(recentExams[0].completed_at).getTime();
                const now = Date.now();
                const diffSeconds = Math.floor((now - lastAttemptTime) / 1000);
                if (diffSeconds < 300) {
                    return {
                        statusCode: 429, body: JSON.stringify({
                            error: 'Cooldown active',
                            cooldownRemaining: 300 - diffSeconds
                        })
                    };
                }
            }
        }

        // 4. Generate Exam Pool
        const questionsPool = selectQuestions(examId);
        if (!questionsPool) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: `Exam ID "${examId}" (type: ${typeof examId}) not found in question bank.`,
                })
            };
        }

        // 5. Build Safe Question Payload and Server Answer Map
        const safeQuestions = [];
        const questionMapping = {}; // Stores correct options securely

        questionsPool.forEach(q => {
            // Also shuffle options to prevent pattern matching
            const optionObjs = q.opts.map((opt, i) => ({ opt, index: i }));

            // True/False formatting preserved
            if (q.opts.length === 2 && q.opts.includes('TRUE')) {
                // keep TRUE FALSE order
            } else {
                optionObjs.sort(() => Math.random() - 0.5);
            }

            safeQuestions.push({
                id: q.id,
                question: q.q,
                options: optionObjs.map(o => o.opt),
                topic: q.topic,
                isTrueFalse: q.opts.length === 2 && q.opts.includes('TRUE')
            });

            // Map the display options back to original option index for grading later
            questionMapping[q.id] = {
                correctIndex: q.correctIndex,
                displayToOrigMap: optionObjs.map(o => o.index), // E.g., if option 0 is actually orig option 3
                topic: q.topic,
                explanation: q.e
            };
        });

        // 6. Store Session in DB
        const { data: sessionData, error: sessionError } = await supabase
            .from('exam_sessions')
            .insert({
                user_id: user?.id || null,
                exam_id: String(examId),
                question_ids: questionMapping
            })
            .select()
            .single();

        if (sessionError || !sessionData) {
            console.error('Session creation failed:', sessionError);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create exam session' }) };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionData.session_id,
                examId: examId,
                title: isNaN(numericId) ? (examId.startsWith('chap') ? 'Chapter Review' : 'Practice Exam') : `Mock Exam ${examId}`,
                questions: safeQuestions
            }),
        };

    } catch (err) {
        console.error('generateExam error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
}
