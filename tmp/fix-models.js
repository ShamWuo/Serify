const fs = require('fs');
const path = require('path');

const files = [
    'pages/api/generate-questions.ts',
    'pages/api/test-model.ts',
    'pages/api/sessions/[sessionId]/tutor/end.ts',
    'pages/api/sessions/[sessionId]/quiz/generate.ts',
    'pages/api/sessions/[sessionId]/quiz/answer.ts',
    'pages/api/sessions/[sessionId]/flashcards/generate.ts',
    'pages/api/sessions/[sessionId]/feynman/submit.ts',
    'pages/api/sessions/[sessionId]/deepdive/[conceptId]/generate.ts',
    'pages/api/sessions/[sessionId]/explanations/[conceptId]/generate.ts',
    'pages/api/process-content.ts',
    'pages/api/serify/analyze-answer.ts',
    'pages/api/serify/stream-curriculum.ts',
    'pages/api/serify/analyze-stream.ts',
    'pages/api/home-chat.ts',
    'pages/api/learn/feynman-evaluate.ts',
    'pages/api/learn/practice-generate.ts',
    'pages/api/learn/flashcards-generate.ts',
    'pages/api/learn/explain-generate.ts',
    'pages/api/learn/deepdive-evaluate.ts',
    'pages/api/flow/orchestrate-stream.ts',
    'pages/api/flow/evaluate.ts',
    'pages/api/explain-concept.ts',
    'pages/api/classify-intent.ts',
    'pages/api/analyze-answer.ts'
];

files.forEach(file => {
    const fullPath = path.resolve('c:/Users/abcde/OneDrive/Desktop/codes/Apps/Serify', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('gemini-2.5-flash')) {
            console.log(`Fixing ${file}...`);
            content = content.replace(/gemini-2\.5-flash/g, 'gemini-1.5-flash');
            fs.writeFileSync(fullPath, content);
        }
    } else {
        console.warn(`File not found: ${file}`);
    }
});
