import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';


interface MarkdownRendererProps {
    children: string;
    className?: string;
}

/**
 * JSON.parse silently corrupts some LaTeX backslash sequences because they
 * happen to be valid JSON escape chars:
 *   \f  → form feed (U+000C)  — kills: \frac, \forall, \fbox
 *   \b  → backspace (U+0008)  — kills: \begin, \binom, \bar
 *   \t  → tab (U+0009)        — kills: \text, \times, \to, \theta, \tau
 *   \r  → carriage return     — kills: \rightarrow, \rangle, \right
 * Restore them before rendering.
 */
function fixLatexBackslashes(s: string): string {
    return s
        .replace(/\u000C/g, '\\f')   // form feed  → \f  (\frac, \forall …)
        .replace(/\u0008/g, '\\b')   // backspace  → \b  (\begin, \binom …)
        .replace(/\t/g, '\\t')       // tab        → \t  (\text, \times, \to …)
        .replace(/\r/g, '\\r');      // CR         → \r  (\right, \rangle …)
    // NOTE: \n (newline) is intentionally preserved — it's valid line-break in markdown.
}

export default function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    const safe = fixLatexBackslashes(children ?? '');
    return (
        <div className={`flow-markdown prose-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                components={{
                    // Open links in new tab
                    a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    
                    code: ({ node, className, children, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                            return (
                                <code
                                    style={{
                                        background: 'var(--surface)',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: '0.9em',
                                        fontFamily: 'monospace',
                                        border: '1px solid var(--border)'
                                    }}
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                    pre: ({ node, children, ...props }) => (
                        <pre
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                padding: '12px 16px',
                                overflowX: 'auto',
                                fontSize: '0.9em',
                                fontFamily: 'monospace'
                            }}
                            {...props}
                        >
                            {children}
                        </pre>
                    ),

                    blockquote: ({ node, children, ...props }) => (
                        <blockquote
                            style={{
                                borderLeft: '3px solid var(--accent)',
                                paddingLeft: '1em',
                                margin: '0.5em 0',
                                color: 'var(--muted)',
                                fontStyle: 'italic'
                            }}
                            {...props}
                        >
                            {children}
                        </blockquote>
                    )
                }}
            >
                {safe}
            </ReactMarkdown>
        </div>
    );
}
