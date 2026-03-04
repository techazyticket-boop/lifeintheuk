#!/usr/bin/env node
// ============================================================
// EXAM VALIDATION SCRIPT — runs at build time
// Validates: question count, no duplicates, correctIndex valid,
// explanations present, topic coverage, balanced distribution
// ============================================================

import { questionBank, TOPIC_LABELS } from '../src/data/questionBank.js';

const QUESTIONS_PER_EXAM = 24;
const TOTAL_EXAMS = 30;
let errors = 0;
let warnings = 0;

function error(msg) { console.error(`  ❌ ERROR: ${msg}`); errors++; }
function warn(msg) { console.warn(`  ⚠️  WARN: ${msg}`); warnings++; }
function pass(msg) { console.log(`  ✅ ${msg}`); }

console.log('\n══════════════════════════════════════════════════════');
console.log('  PassBrita — Exam Validation (Production)');
console.log('══════════════════════════════════════════════════════\n');

// ── 1. Validate Question Bank ────────────────────────────────
console.log('📋 Validating Question Bank...');
console.log(`   Total questions: ${questionBank.length}`);

const minQuestionsNeeded = Math.ceil(QUESTIONS_PER_EXAM * TOTAL_EXAMS / 4);
if (questionBank.length < minQuestionsNeeded) {
    error(`Need at least ${minQuestionsNeeded} questions for ${TOTAL_EXAMS} exams with reasonable diversity, have ${questionBank.length}`);
} else {
    pass(`Pool size ${questionBank.length} ≥ ${minQuestionsNeeded} minimum for ${TOTAL_EXAMS} exams`);
}

// Check each question
let validQuestions = 0;
questionBank.forEach((q, i) => {
    let hasError = false;

    // correctIndex must exist and be valid
    if (q.correctIndex === undefined || q.correctIndex === null) {
        error(`Q${i}: missing correctIndex`);
        hasError = true;
    } else if (q.correctIndex < 0 || q.correctIndex >= q.opts.length) {
        error(`Q${i}: correctIndex ${q.correctIndex} out of bounds (${q.opts.length} options)`);
        hasError = true;
    }

    // Explanation must exist
    if (!q.e || q.e.trim() === '') {
        error(`Q${i}: missing explanation`);
        hasError = true;
    }

    // Topic must exist
    if (!q.topic) {
        error(`Q${i}: missing topic`);
        hasError = true;
    } else if (!TOPIC_LABELS[q.topic]) {
        warn(`Q${i}: unknown topic "${q.topic}"`);
    }

    // Options must have at least 2 choices
    if (!q.opts || q.opts.length < 2) {
        error(`Q${i}: must have at least 2 options`);
        hasError = true;
    }

    // Question text must exist
    if (!q.q || q.q.trim() === '') {
        error(`Q${i}: missing question text`);
        hasError = true;
    }

    // Check correctIndex answer text is not empty
    if (q.opts && q.correctIndex >= 0 && q.correctIndex < q.opts.length) {
        if (!q.opts[q.correctIndex] || q.opts[q.correctIndex].trim() === '') {
            error(`Q${i}: correct answer option is empty`);
            hasError = true;
        }
    }

    if (!hasError) validQuestions++;
});

// Check for duplicate questions (exact question text)
const seenQuestions = new Map();
let duplicateCount = 0;
questionBank.forEach((q, i) => {
    const key = q.q.trim().toLowerCase();
    if (seenQuestions.has(key)) {
        warn(`Q${i} is a duplicate of Q${seenQuestions.get(key)}: "${q.q.substring(0, 60)}..."`);
        duplicateCount++;
    } else {
        seenQuestions.set(key, i);
    }
});

pass(`${validQuestions}/${questionBank.length} questions valid${duplicateCount > 0 ? `, ${duplicateCount} duplicates found` : ''}`);

// ── 2. Topic Coverage & Balance ──────────────────────────────
console.log('\n📊 Topic Coverage & Balance...');
const topicCounts = {};
questionBank.forEach(q => {
    topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
});

const topicEntries = Object.entries(TOPIC_LABELS);
const topicCountValues = topicEntries.map(([key]) => topicCounts[key] || 0);
const avgPerTopic = Math.round(questionBank.length / topicEntries.length);
const minTopic = Math.min(...topicCountValues.filter(v => v > 0));
const maxTopic = Math.max(...topicCountValues);

topicEntries.forEach(([key, label]) => {
    const count = topicCounts[key] || 0;
    if (count === 0) {
        error(`Topic "${label}" has 0 questions`);
    } else if (count < 5) {
        warn(`Topic "${label}" has only ${count} questions (recommend 10+)`);
    } else {
        pass(`${label}: ${count} questions`);
    }
});

console.log(`\n   Distribution: avg ${avgPerTopic}/topic, min ${minTopic}, max ${maxTopic}`);
if (maxTopic > avgPerTopic * 3) {
    warn(`Topic imbalance: max topic has ${maxTopic} questions vs avg ${avgPerTopic}`);
}

// ── 3. Validate Generated Exams ──────────────────────────────
console.log('\n📝 Validating Generated Exams...');

// Seeded shuffle (same as examEngine)
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

const exams = [];
for (let id = 1; id <= TOTAL_EXAMS; id++) {
    const seed = id * 997 + 13;
    const shuffled = seededShuffle(questionBank, seed);
    const selected = shuffled.slice(0, QUESTIONS_PER_EXAM);

    if (selected.length !== QUESTIONS_PER_EXAM) {
        error(`Exam ${id}: has ${selected.length} questions, expected ${QUESTIONS_PER_EXAM}`);
    }

    // Check correctIndex validity in generated exam
    selected.forEach((q, qi) => {
        if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex >= q.opts.length) {
            error(`Exam ${id}, Q${qi}: invalid correctIndex ${q.correctIndex}`);
        }
        if (!q.e || q.e.trim() === '') {
            error(`Exam ${id}, Q${qi}: missing explanation`);
        }
    });

    // Check topic balance within exam
    const examTopics = {};
    selected.forEach(q => {
        examTopics[q.topic] = (examTopics[q.topic] || 0) + 1;
    });
    const topicSpread = Object.keys(examTopics).length;
    if (topicSpread < 3) {
        warn(`Exam ${id}: only covers ${topicSpread} topics (should cover 3+)`);
    }

    exams.push(selected);
}

pass(`${TOTAL_EXAMS} exams generated with ${QUESTIONS_PER_EXAM} questions each`);

// ── 4. Overlap Analysis ──────────────────────────────────────
console.log('\n🔍 Overlap Analysis...');
let maxOverlap = 0;
let highOverlapPairs = 0;

for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
        const setI = new Set(exams[i].map(q => q.q));
        const shared = exams[j].filter(q => setI.has(q.q)).length;
        if (shared > maxOverlap) maxOverlap = shared;
        if (shared > 12) {
            warn(`Exam ${i + 1} vs Exam ${j + 1}: ${shared}/24 shared questions (>50% overlap)`);
            highOverlapPairs++;
        }
    }
}

pass(`Max overlap: ${maxOverlap}/${QUESTIONS_PER_EXAM} questions between any pair`);
if (highOverlapPairs > 0) {
    warn(`${highOverlapPairs} exam pairs have >50% overlap`);
} else {
    pass('No exam pairs have >50% overlap');
}

// ── 5. Scalability Check ─────────────────────────────────────
console.log('\n📐 Scalability Assessment...');
const possibleExams = Math.floor(questionBank.length / QUESTIONS_PER_EXAM);
pass(`Current pool supports ~${possibleExams} unique exams`);
if (questionBank.length >= 1000) {
    pass('Question bank ≥ 1000 — excellent scalability');
} else if (questionBank.length >= 500) {
    pass(`Question bank at ${questionBank.length} — good scalability`);
} else if (questionBank.length >= 200) {
    pass(`Question bank at ${questionBank.length} — adequate for current needs`);
} else {
    warn(`Question bank at ${questionBank.length} — consider adding more questions for better diversity`);
}

// ── Summary ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
if (errors > 0) {
    console.error(`\n  ❌ VALIDATION FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
    process.exit(1);
} else {
    console.log(`\n  ✅ VALIDATION PASSED: 0 errors, ${warnings} warning(s)\n`);
    process.exit(0);
}
