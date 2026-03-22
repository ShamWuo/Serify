const fs = require('fs');
const path = require('path');

function walk(d) {
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d).forEach(f => {
        let p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
            let c = fs.readFileSync(p, 'utf8');
            let original = c;

            // Remove standalone fragments like "|| 1;" or "* (proMode ? 5 : 1);"
            // These usually catch lines that were previously part of a sparkCost calculation
            c = c.replace(/^\s+(\|\|\s*\d+;)\s*$/gm, '');
            c = c.replace(/^\s+(\*\s*\(proMode\s*\?\s*5\s*:\s*1\);)\s*$/gm, '');

            // Catch "const sparkCost = ... * (proMode ? 5 : 1);"
            c = c.replace(/const\s+sparkCost\s*=\s*sparkCostBase\s*\*\s*\(proMode\s*\?\s*5\s*:\s*1\);/g, '');

            // Specific cleanup for refresh-subscription.ts or similar
            c = c.replace(/const\s+monthlyAllowance\s*=\s*PLAN_SPARK_ALLOWANCE\[plan\]\s*\|\|\s*20;/g, '');

            if (c !== original) {
                fs.writeFileSync(p, c, 'utf8');
                console.log('Fixed fragments in', p);
            }
        }
    });
}

walk('pages/api');
console.log('Done cleaning fragments.');
