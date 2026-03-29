/**
 * Normalizes conceptual titles by removing protocol prefixes (e.g., txt://, yt://)
 * and other AI-specific markers.
 */
export function normalizeTitle(title: string | null | undefined): string {
    if (!title) return '';
    
    // Remove (Context: ...) markers completely including their contents if present.
    // We use a simple indexOf and loop to handle potentially nested parentheses correctly.
    let clean = title;
    let contextIdx = clean.indexOf('(Context:');
    if (contextIdx === -1) contextIdx = clean.indexOf('(context:'); // case insensitivity
    while (contextIdx !== -1) {
        let openCount = 0;
        let endIndex = -1;
        for (let i = contextIdx; i < clean.length; i++) {
            if (clean[i] === '(') openCount++;
            else if (clean[i] === ')') {
                openCount--;
                if (openCount === 0) {
                    endIndex = i;
                    break;
                }
            }
        }
        if (endIndex !== -1) {
            clean = clean.substring(0, contextIdx) + clean.substring(endIndex + 1);
        } else {
            // unmatched parens, just remove the rest of the string
            clean = clean.substring(0, contextIdx);
        }
        contextIdx = clean.indexOf('(Context:');
        if (contextIdx === -1) contextIdx = clean.indexOf('(context:');
    }
    
    // Clean up possible trailing/leading spaces or double spaces created by removal
    clean = clean.replace(/\s+/g, ' ').trim();
    clean = clean.replace(/^[a-z]+:\/\//i, '');
    
    // Capitalize first letter if it's all lowercase
    if (clean && clean === clean.toLowerCase()) {
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    
    return clean.trim();
}
