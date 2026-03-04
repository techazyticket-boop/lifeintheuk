import { questionBank } from '../src/data/questionBank.js';

export const EXAM_CONSTANTS = {
    QUESTIONS_PER_EXAM: 24,
    PASS_THRESHOLD: 18,
    PASS_PERCENTAGE: 75,
    EXAM_DURATION_MINUTES: 45,
    TOTAL_EXAMS: 30,
    FREE_EXAMS: 3,
};

function createSeededRNG(seed) {
    let s = seed;
    return () => {
        const x = Math.sin(s++) * 10000;
        return x - Math.floor(x);
    };
}

function seededShuffle(array, seed) {
    const arr = [...array];
    const rand = createSeededRNG(seed);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function isTrueFalseQuestion(opts) {
    return (
        opts.length === 2 &&
        opts.map(o => o.toUpperCase()).includes('TRUE') &&
        opts.map(o => o.toUpperCase()).includes('FALSE')
    );
}

export function generateExam(examId) {
    const isPremium = examId > EXAM_CONSTANTS.FREE_EXAMS;
    const title = `Mock Exam ${examId}`;

    const seed = examId * 997 + 13;
    const shuffled = seededShuffle(questionBank, seed);
    const selected = shuffled.slice(0, EXAM_CONSTANTS.QUESTIONS_PER_EXAM);

    const questions = selected.map((q, i) => {
        const tf = isTrueFalseQuestion(q.opts);
        return {
            id: `q-${examId}-${i}`,
            question: q.q,
            options: tf ? ['TRUE', 'FALSE'] : q.opts,
            correctIndex: q.correctIndex,
            explanation: q.e,
            topic: q.topic,
            isTrueFalse: tf,
        };
    });

    return {
        id: examId,
        title,
        isPremium,
        questions,
        passThreshold: EXAM_CONSTANTS.PASS_THRESHOLD,
        questionsCount: EXAM_CONSTANTS.QUESTIONS_PER_EXAM,
    };
}

export function generateAllExams() {
    const exams = [];
    for (let i = 1; i <= EXAM_CONSTANTS.TOTAL_EXAMS; i++) {
        exams.push(generateExam(i));
    }
    return exams;
}

const CHAPTERS = [
    { id: 'chap-1', title: 'Chapter 1 Practice', topics: ['values'] },
    { id: 'chap-2', title: 'Chapter 2 Practice', topics: ['geography'] },
    { id: 'chap-3', title: 'Chapter 3 Practice', topics: ['history_early', 'history_modern', 'science'] },
    { id: 'chap-4', title: 'Chapter 4 Practice', topics: ['culture', 'traditions', 'sport'] },
    { id: 'chap-5', title: 'Chapter 5 Practice', topics: ['government'] },
];

export function generateChapterExam(chapId) {
    const chap = CHAPTERS.find(c => c.id === chapId);
    if (!chap) return null;

    const chapQs = questionBank.filter(q => chap.topics.includes(q.topic));
    const seed = 12345;
    const shuffled = seededShuffle(chapQs, seed).slice(0, EXAM_CONSTANTS.QUESTIONS_PER_EXAM);

    return {
        id: chapId,
        title: chap.title,
        isPremium: ['chap-3', 'chap-4', 'chap-5'].includes(chapId),
        passThreshold: Math.max(1, Math.floor(shuffled.length * 0.75)),
        questionsCount: shuffled.length,
        questions: shuffled.map((q, i) => {
            const tf = isTrueFalseQuestion(q.opts);
            return {
                id: `cq-${chapId}-${i}`,
                question: q.q,
                options: tf ? ['TRUE', 'FALSE'] : q.opts,
                correctIndex: q.correctIndex,
                explanation: q.e,
                topic: q.topic,
                isTrueFalse: tf,
            };
        }),
    };
}
