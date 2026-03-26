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
    return s
        .replace(/\u000C/g, '\\f')   
        .replace(/\u0008/g, '\\b')   
        .replace(/\t/g, '\\t')       
        .replace(/\r/g, '\\r');      
    
}

export default function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    const safe = fixLatexBackslashes(children ?? '');
    return (
        <div className={`flow-markdown prose-content ${className}`}>
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
