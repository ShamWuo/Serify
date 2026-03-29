import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
    children: string;
    className?: string;
}

function fixLatexBackslashes(s: string): string {
    if (!s) return '';
    
    return s
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        // Fix LaTeX dollar signs that some LLMs incorrectly escape
        .replace(/\\\$/g, '$')
        // Standard backslash fix: some AI models double-escape math backslashes as \\frac
        .replace(/\\\\/g, '\\')
        // Support common delimiters that some LLMs prefer
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\\\[/g, '$$')
        .replace(/\\\]/g, '$$');
}

export default function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    const safe = fixLatexBackslashes(children);
    return (
        <div className={`flow-markdown prose-content ${className}`} style={{
            // Tighten default markdown spacing
            lineHeight: '1.5',
        }}>
            <style jsx global>{`
                .flow-markdown h1, .flow-markdown h2, .flow-markdown h3, .flow-markdown h4 {
                    margin-top: 0.7em !important;
                    margin-bottom: 0.25em !important;
                    line-height: 1.2 !important;
                }
                .flow-markdown p {
                    margin-bottom: 0.4em !important;
                }
                .flow-markdown ul, .flow-markdown ol {
                    margin-top: 0 !important;
                    margin-bottom: 0.5em !important;
                }
                .flow-markdown li {
                    margin-bottom: 0.15em !important;
                }
                .flow-markdown h1:first-child, .flow-markdown h2:first-child, .flow-markdown h3:first-child {
                    margin-top: 0 !important;
                }
                .flow-markdown p:last-child {
                    margin-bottom: 0 !important;
                }
            `}</style>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                components={{
                    
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
                                border: '2px solid var(--border)',
                                borderRadius: 2,
                                padding: '12px 16px',
                                overflowX: 'auto',
                                fontSize: '0.875em',
                                fontFamily: 'IBM Plex Mono, monospace'
                            }}
                            {...props}
                        >
                            {children}
                        </pre>
                    ),

                    blockquote: ({ node, children, ...props }) => (
                        <blockquote
                            style={{
                                borderLeft: '4px solid var(--accent)',
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
