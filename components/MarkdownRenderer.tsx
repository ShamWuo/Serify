import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';


interface MarkdownRendererProps {
    children: string;
    className?: string;
}

/**
 * Shared markdown renderer with:
 * - KaTeX math rendering (inline $...$ and block $$...$$)
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - Proper prose styling
 */
export default function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`flow-markdown prose-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    // Open links in new tab
                    a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    // Style code blocks
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
                    // Better blockquotes
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
                {children}
            </ReactMarkdown>
        </div>
    );
}
