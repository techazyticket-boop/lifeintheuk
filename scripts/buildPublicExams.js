import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { generateAllExams, generateChapterExam } from './generator.js';
import { questionBank } from '../src/data/questionBank.js';

console.log('Building client-safe exams...');
const allExams = generateAllExams();
const allChapterExams = [
    generateChapterExam('chap-1'),
    generateChapterExam('chap-2'),
    generateChapterExam('chap-3'),
    generateChapterExam('chap-4'),
    generateChapterExam('chap-5')
];

// Strip out sensitive answers and explanations
function makeSafe(examIdList) {
    return examIdList.map(exam => {
        return {
            ...exam,
            questions: exam.questions.map(q => {
                return {
                    id: q.id,
                    question: q.question,
                    options: q.options,
                    topic: q.topic,
                    isTrueFalse: q.isTrueFalse
                };
            })
        };
    });
}

const safeExams = makeSafe(allExams);
const safeChapters = makeSafe(allChapterExams);

const safeQuestionBank = questionBank.map(q => ({
    q: q.q,
    opts: q.opts,
    topic: q.topic
}));

const outputPath = path.join(__dirname, '../src/data/publicExams.js');
const fileContent = `// AUTO-GENERATED: DO NOT EDIT
// This file contains a client-safe version of the exams (no answers or explanations).
export const mockExams = ${JSON.stringify(safeExams, null, 4)};
export const chapterExams = ${JSON.stringify(safeChapters, null, 4)};
export const publicQuestionBank = ${JSON.stringify(safeQuestionBank, null, 4)};\n`;

fs.writeFileSync(outputPath, fileContent);
console.log('Successfully wrote src/data/publicExams.js');

