const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function getFeatureForFile(filePath) {
    if (filePath.includes('vault')) return 'vault_concepts';
    if (filePath.includes('deepdive')) return 'deep_dives';
    if (filePath.includes('flashcard')) return 'flashcards';
    if (filePath.includes('quiz') || filePath.includes('practice')) return 'quizzes';
    if (filePath.includes('tutor') || filePath.includes('home-chat') || filePath.includes('feynman') || filePath.includes('explanation') || filePath.includes('explain')) return 'ai_messages';
    if (filePath.includes('flow') || filePath.includes('flow-mode')) return 'flow_sessions';
    if (filePath.includes('curriculum')) return 'curricula';
    if (filePath.includes('serify/extract') || filePath.includes('serify/assess') || filePath.includes('serify/analyze') || filePath.includes('process-content')) return 'sessions';
    // Default fallback:
    return 'sessions';
}

walkDir('pages/api', (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    if (content.includes('lib/sparks')) {
        const feature = getFeatureForFile(filePath);

        // Update imports: extract authenticateApiRequest if it exists
        content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/sparks['"];*/g, (match, importsStr) => {
            let imports = importsStr.split(',').map(s => s.trim());
            let newImports = new Set();
            if (imports.includes('authenticateApiRequest')) newImports.add('authenticateApiRequest');
            if (imports.includes('hasEnoughSparks') || imports.includes('deductSparks')) {
                newImports.add('checkUsage');
                newImports.add('incrementUsage');
            }
            if (newImports.size === 0) return '';
            return `import { ${Array.from(newImports).join(', ')} } from '@/lib/usage';`;
        });

        // Remove SPARK_COSTS declarations
        content = content.replace(/const\s+sparkCost\s*=\s*SPARK_COSTS\.[A-Z_]+;?\s*/g, '');
        content = content.replace(/SPARK_COSTS\.[A-Z_]+/g, '0');

        // Replace logic
        content = content.replace(/await\s+hasEnoughSparks\s*\(\s*([^,]+)\s*,\s*[^)]+\s*\)/g, `(await checkUsage($1, '${feature}')).allowed`);
        content = content.replace(/await\s+deductSparks\s*\(\s*([^,]+)[^)]*\)/g, `(await incrementUsage($1, '${feature}'), { success: true })`);

        // Replace error messages related to sparks
        content = content.replace(/error:\s*['"`]out_of_sparks['"`]/g, `error: 'limit_reached'`);
        content = content.replace(/message:\s*[`'"]You need [^`'"]+Spark[^`'"]+[`'"]/g, `message: 'You have reached your feature limit.'`);
        // Also catch multiline spark messages
        content = content.replace(/message:\s*`You need \$\{sparkCost\} Spark[^`]*`/g, `message: 'You have reached your limit.'`);

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated', filePath);
        }
    }
});
