const fs = require('fs');
const path = require('path');

const b = String.fromCharCode(92);
const q = '"';
const s = "'";
const t = "`";

const strPat = '("(?:[^"\\\\\\\\\\\\\\\\]|\\\\\\\\\\\\\\\\.)*"|\'(?:[^\'\\\\\\\\\\\\\\\\]|\\\\\\\\\\\\\\\\.)*\'|`(?:[^`\\\\\\\\\\\\\\\\]|\\\\\\\\\\\\\\\\.)*`)';
const commentPat = '(\\\\//.*|\\\\/\\\\*[^]*?\\\\*\\\\/)';
const regex = new RegExp(strPat + '|' + commentPat, 'g');

function cleanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let cleaned = content.replace(regex, (match, g1, g2) => g1 ? g1 : '');
    cleaned = cleaned.split(String.fromCharCode(10)).map(line => line.trimEnd()).join(String.fromCharCode(10));
    fs.writeFileSync(filePath, cleaned);
}

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
                walk(dirPath, callback);
            }
        } else {
            if (/\.(ts|tsx|js|jsx)$/.test(f)) {
                callback(dirPath);
            }
        }
    });
}

console.log('Cleaning comments...');
walk('.', (filePath) => {
    if (filePath === 'clean_comments.js') return;
    cleanFile(filePath);
});
console.log('Done.');
