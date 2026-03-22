const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p, callback);
        else callback(p);
    });
}

function fixTokenActions() {
    walk('pages', filePath => {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        content = content.replace(/'sessions'/g, "'session_standard'");
        content = content.replace(/"sessions"/g, "'session_standard'");
        content = content.replace(/'ai_messages'/g, "'ai_message_tier1'");
        content = content.replace(/"ai_messages"/g, "'ai_message_tier1'");
        content = content.replace(/'flow_sessions'/g, "'flow_mode_session'");
        content = content.replace(/"flow_sessions"/g, "'flow_mode_session'");
        content = content.replace(/'curricula'/g, "'learn_mode_curriculum'");
        content = content.replace(/"curricula"/g, "'learn_mode_curriculum'");
        content = content.replace(/'deep_dives'/g, "'deep_dive'");
        content = content.replace(/"deep_dives"/g, "'deep_dive'");
        content = content.replace(/'quizzes'/g, "'practice_quiz'");
        content = content.replace(/"quizzes"/g, "'practice_quiz'");
        content = content.replace(/'flashcards'/g, "'flashcard_generation'");
        content = content.replace(/"flashcards"/g, "'flashcard_generation'");

        content = content.replace(/usage\.limit/g, "usage.monthlyLimit");
        content = content.replace(/usage\.used/g, "usage.tokensUsed");

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed', filePath);
        }
    });
}

fixTokenActions();