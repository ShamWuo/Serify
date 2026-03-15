/**
 * GeneratingAnimation.tsx
 * Purpose: A reusable component that simulates AI content being built out
 * progressively. Instead of a spinner, skeleton lines draw themselves out
 * one by one sequentially to create the illusion of the AI writing.
 */

import React from 'react';

type AnimationType = 'text' | 'cards' | 'exam';

interface GeneratingAnimationProps {
    type?: AnimationType;
    label?: string;
}

// Defines the skeleton shapes for each feature type.
const textLines = [
    'w-3/4', 'w-full', 'w-5/6', 'w-full', 'w-2/3',
    'w-full', 'w-4/5', 'w-full', 'w-3/4', 'w-1/2'
];

const cardShapes = [
    { front: 'w-4/5', back: 'w-full' },
    { front: 'w-3/4', back: 'w-5/6' },
    { front: 'w-full', back: 'w-2/3' },
];

const examShapes = [
    { q: 'w-5/6', a: null },
    { q: 'w-full', a: null },
    { q: 'w-3/4', a: null },
    { q: 'w-4/5', a: null },
];

export default function GeneratingAnimation({
    type = 'text',
    label,
}: GeneratingAnimationProps) {
    const baseDelay = 180; // ms per line

    if (type === 'cards') {
        return (
            <div className="generating-animation-root w-full space-y-4">
                {label && (
                    <p className="text-[var(--muted)] text-sm font-medium text-center mb-6 animate-fade-in">
                        {label}
                    </p>
                )}
                <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
                    {cardShapes.map((card, i) => (
                        <div
                            key={i}
                            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3"
                            style={{ animationDelay: `${i * 300}ms` }}
                        >
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] opacity-60">
                                    Question
                                </div>
                                <div
                                    className="skel-line h-4 bg-[var(--border)] rounded-full"
                                    style={{
                                        '--skel-target': card.front,
                                        animationDelay: `${i * 300}ms`,
                                    } as React.CSSProperties}
                                />
                            </div>
                            <div className="border-t border-[var(--border)] pt-3 space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] opacity-60">
                                    Answer
                                </div>
                                <div
                                    className="skel-line h-4 bg-[var(--border)] rounded-full"
                                    style={{
                                        '--skel-target': card.back,
                                        animationDelay: `${i * 300 + 150}ms`,
                                    } as React.CSSProperties}
                                />
                                <div
                                    className="skel-line h-3.5 bg-[var(--border)] rounded-full opacity-60"
                                    style={{
                                        '--skel-target': 'w-3/5',
                                        animationDelay: `${i * 300 + 220}ms`,
                                    } as React.CSSProperties}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'exam') {
        return (
            <div className="generating-animation-root w-full space-y-5">
                {label && (
                    <p className="text-[var(--muted)] text-sm font-medium text-center mb-4 animate-fade-in">
                        {label}
                    </p>
                )}
                {examShapes.map((item, i) => (
                    <div
                        key={i}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div
                                className="skel-line h-4 bg-[var(--border)] rounded-full"
                                style={{
                                    '--skel-target': '50px',
                                    width: '50px',
                                    minWidth: '0',
                                    animationDelay: `${i * 350}ms`,
                                } as React.CSSProperties}
                            />
                        </div>
                        <div
                            className="skel-line h-5 bg-[var(--border)] rounded-lg"
                            style={{
                                '--skel-target': item.q,
                                animationDelay: `${i * 350 + 100}ms`,
                            } as React.CSSProperties}
                        />
                        <div
                            className="skel-line h-4 bg-[var(--border)] rounded-lg opacity-70"
                            style={{
                                '--skel-target': 'w-full',
                                animationDelay: `${i * 350 + 180}ms`,
                            } as React.CSSProperties}
                        />
                        <div className="h-16 mt-2 bg-[var(--border)] rounded-lg opacity-30 skel-line" style={{
                            '--skel-target': 'w-full',
                            animationDelay: `${i * 350 + 260}ms`,
                        } as React.CSSProperties} />
                    </div>
                ))}
            </div>
        );
    }

    // Default: 'text' type — for explanations and long-form AI content
    return (
        <div className="generating-animation-root w-full space-y-3">
            {label && (
                <p className="text-[var(--muted)] text-sm font-medium mb-6 animate-fade-in">
                    {label}
                </p>
            )}
            {/* Simulate a heading first */}
            <div
                className="skel-line h-7 bg-[var(--border)] rounded-lg mb-6"
                style={{
                    '--skel-target': '55%',
                    width: '55%',
                    minWidth: '0',
                    animationDelay: '0ms',
                } as React.CSSProperties}
            />
            {textLines.map((widthClass, i) => (
                <div
                    key={i}
                    className={`skel-line h-4 bg-[var(--border)] rounded-full ${widthClass}`}
                    style={{
                        animationDelay: `${i * baseDelay}ms`,
                    } as React.CSSProperties}
                />
            ))}
            {/* Simulate a second heading */}
            <div
                className="skel-line h-6 bg-[var(--border)] rounded-lg mt-8 mb-2"
                style={{
                    '--skel-target': '45%',
                    width: '45%',
                    minWidth: '0',
                    animationDelay: `${textLines.length * baseDelay}ms`,
                } as React.CSSProperties}
            />
            {textLines.slice(0, 5).map((widthClass, i) => (
                <div
                    key={`b${i}`}
                    className={`skel-line h-4 bg-[var(--border)] rounded-full ${widthClass}`}
                    style={{
                        animationDelay: `${(textLines.length + i + 1) * baseDelay}ms`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
}
