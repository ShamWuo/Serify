import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

interface StrengthMapItem {
    concept_id: string;
    mastery_state: 'solid' | 'developing' | 'shaky' | 'revisit' | 'skipped';
    feedback_text: string;
}

interface PublicSession {
    id: string;
    title: string;
    depth_score: number | null;
    created_at: string | null;
    conceptNames: Record<string, string>;
    strength_map: StrengthMapItem[];
    summary_sentence: string | null;
    overall_counts: Record<string, number>;
}

interface Props {
    session: PublicSession | null;
    siteUrl: string;
}

export default function PublicSessionPage({ session, siteUrl }: Props) {
    if (!session) {
        return (
            <>
                <Head>
                    <title>Session Not Found | Serify</title>
                </Head>
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#faf9f7',
                        fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        gap: '16px',
                        color: '#4b5563'
                    }}
                >
                    <div style={{ fontSize: 48 }}>🔒</div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
                        This session is private or doesn&apos;t exist.
                    </h1>
                    <Link
                        href="/signup"
                        style={{
                            padding: '12px 28px',
                            background: '#2d6a4f',
                            color: 'white',
                            borderRadius: 12,
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}
                    >
                        Try Serify free &rarr;
                    </Link>
                </div>
            </>
        );
    }

    const shareUrl = `${siteUrl}/s/${session.id}`;
    const ogImageUrl = `${siteUrl}/api/og?sessionId=${session.id}`;
    const miscCount = Object.values(session.overall_counts).reduce((a, b) => a + b, 0);
    const solidCount = session.overall_counts['solid'] ?? 0;

    const masteryStyles: Record<string, { bg: string; text: string; label: string }> = {
        solid: { bg: '#dcfce7', text: '#15803d', label: 'Solid' },
        developing: { bg: '#dbeafe', text: '#1d4ed8', label: 'Developing' },
        shaky: { bg: '#fef9c3', text: '#b45309', label: 'Shaky' },
        revisit: { bg: '#fee2e2', text: '#b91c1c', label: 'Needs Revisit' },
        skipped: { bg: '#f3f4f6', text: '#6b7280', label: 'Skipped' }
    };

    return (
        <>
            <Head>
                <title>{session.title} | Serify Report</title>
                <meta
                    name="description"
                    content={`Serify diagnostic report: "${session.summary_sentence ?? session.title}" — See how well the concepts were understood.`}
                />
                {/* Open Graph */}
                <meta property="og:title" content={`${session.title} | Serify Report`} />
                <meta
                    property="og:description"
                    content="Serify maps understanding — not just answers. See exactly what stuck and what didn't."
                />
                <meta property="og:image" content={ogImageUrl} />
                <meta property="og:url" content={shareUrl} />
                <meta property="og:type" content="website" />
                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${session.title} | Serify`} />
                <meta
                    name="twitter:description"
                    content="Diagnostic learning report — see the gaps Serify found."
                />
                <meta name="twitter:image" content={ogImageUrl} />
            </Head>

            <div
                style={{
                    minHeight: '100vh',
                    background: '#faf9f7',
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    color: '#1a1a1a'
                }}
            >
                {/* Viral CTA Banner — top of page for unauthenticated visitors */}
                <div
                    style={{
                        background: '#1b4332',
                        color: 'white',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        flexWrap: 'wrap'
                    }}
                >
                    <span style={{ fontSize: 15, opacity: 0.9 }}>
                        Serify found{' '}
                        <strong>{miscCount - solidCount} gaps</strong> in this
                        session. What will it find in yours?
                    </span>
                    <Link
                        href="/signup"
                        style={{
                            background: '#52b788',
                            color: 'white',
                            padding: '8px 20px',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Get 15 free Sparks &rarr;
                    </Link>
                </div>

                <div
                    style={{
                        maxWidth: 820,
                        margin: '0 auto',
                        padding: '48px 24px 80px'
                    }}
                >
                    {/* Header */}
                    <div style={{ marginBottom: 48 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 16
                            }}
                        >
                            <span
                                style={{
                                    background: '#dcfce7',
                                    color: '#2d6a4f',
                                    padding: '4px 12px',
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Serify Report
                            </span>
                            <span style={{ color: '#9ca3af', fontSize: 13 }}>
                                Public &bull;{' '}
                                {session.created_at
                                    ? new Date(session.created_at).toLocaleDateString(
                                        'en-US',
                                        {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }
                                    )
                                    : ''}
                            </span>
                        </div>

                        <h1
                            style={{
                                fontSize: 36,
                                fontWeight: 700,
                                fontFamily: 'Georgia, serif',
                                lineHeight: 1.3,
                                marginBottom: 12
                            }}
                        >
                            {session.title}
                        </h1>

                        {session.summary_sentence && (
                            <p
                                style={{
                                    fontSize: 20,
                                    color: '#374151',
                                    lineHeight: 1.6,
                                    fontStyle: 'italic',
                                    borderLeft: '3px solid #2d6a4f',
                                    paddingLeft: 16
                                }}
                            >
                                &ldquo;{session.summary_sentence}&rdquo;
                            </p>
                        )}
                    </div>

                    {/* Mastery Badges */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginBottom: 48
                        }}
                    >
                        {Object.entries(session.overall_counts)
                            .filter(([, count]) => count > 0)
                            .map(([state, count]) => {
                                const style = masteryStyles[state];
                                if (!style) return null;
                                return (
                                    <span
                                        key={state}
                                        style={{
                                            background: style.bg,
                                            color: style.text,
                                            padding: '6px 14px',
                                            borderRadius: 8,
                                            fontSize: 14,
                                            fontWeight: 700
                                        }}
                                    >
                                        {count} {style.label}
                                    </span>
                                );
                            })}
                        {session.depth_score !== null && (
                            <span
                                style={{
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    border: '1px solid #bbf7d0'
                                }}
                            >
                                Depth Score: {session.depth_score}
                            </span>
                        )}
                    </div>

                    {/* Strength Map */}
                    {session.strength_map && session.strength_map.length > 0 && (
                        <section style={{ marginBottom: 48 }}>
                            <h2
                                style={{
                                    fontSize: 24,
                                    fontFamily: 'Georgia, serif',
                                    fontWeight: 700,
                                    marginBottom: 24,
                                    paddingBottom: 12,
                                    borderBottom: '1px solid #e5e0d8'
                                }}
                            >
                                Strength Map
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {session.strength_map.map((item, idx) => {
                                    const style =
                                        masteryStyles[item.mastery_state] ??
                                        masteryStyles['skipped'];
                                    const conceptName =
                                        session.conceptNames[item.concept_id] ?? 'Concept';
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                background: 'white',
                                                border: '1px solid #e5e0d8',
                                                borderRadius: 16,
                                                padding: '20px 24px',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: 10,
                                                    gap: 12
                                                }}
                                            >
                                                <h4
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: 17,
                                                        margin: 0
                                                    }}
                                                >
                                                    {conceptName}
                                                </h4>
                                                <span
                                                    style={{
                                                        background: style.bg,
                                                        color: style.text,
                                                        padding: '3px 10px',
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {style.label}
                                                </span>
                                            </div>
                                            <p
                                                style={{
                                                    fontSize: 15,
                                                    lineHeight: 1.65,
                                                    color: '#374151',
                                                    margin: 0
                                                }}
                                            >
                                                {item.feedback_text}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Bottom Viral CTA */}
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #1b4332, #2d6a4f)',
                            borderRadius: 20,
                            padding: '36px 32px',
                            color: 'white',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                        <h2
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                                fontFamily: 'Georgia, serif',
                                marginBottom: 10
                            }}
                        >
                            What will Serify find in your notes?
                        </h2>
                        <p
                            style={{
                                fontSize: 16,
                                opacity: 0.85,
                                marginBottom: 24,
                                lineHeight: 1.6,
                                maxWidth: 480,
                                margin: '0 auto 24px'
                            }}
                        >
                            Serify maps your true understanding — not just what you read. It
                            finds the gaps that multiple-choice tests miss.
                        </p>
                        <Link
                            href="/signup"
                            style={{
                                display: 'inline-block',
                                background: 'white',
                                color: '#1b4332',
                                padding: '14px 32px',
                                borderRadius: 12,
                                fontWeight: 700,
                                fontSize: 16,
                                textDecoration: 'none',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                            }}
                        >
                            Get 15 free Sparks &rarr;
                        </Link>
                        <p style={{ marginTop: 12, fontSize: 13, opacity: 0.65 }}>
                            No credit card. No commitment.
                        </p>
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            marginTop: 40,
                            textAlign: 'center',
                            color: '#9ca3af',
                            fontSize: 13
                        }}
                    >
                        Powered by{' '}
                        <Link
                            href="/"
                            style={{ color: '#2d6a4f', textDecoration: 'none', fontWeight: 600 }}
                        >
                            Serify
                        </Link>{' '}
                        — Diagnostic learning for people who want to actually understand.
                    </div>
                </div>
            </div>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { sessionId } = context.params as { sessionId: string };
    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch the session
    const { data: session } = await supabase
        .from('reflection_sessions')
        .select('id, title, depth_score, is_public, created_at')
        .eq('id', sessionId)
        .single();

    if (!session || !session.is_public) {
        return { props: { session: null, siteUrl } };
    }

    // Fetch concepts for name lookup
    const { data: concepts } = await supabase
        .from('concepts')
        .select('id, name')
        .eq('session_id', sessionId);

    const conceptNames: Record<string, string> = {};
    (concepts ?? []).forEach((c) => {
        conceptNames[c.id] = c.name;
    });

    // Fetch the analysis (strength map + summary)
    const { data: analysis } = await supabase
        .from('analyses')
        .select('strength_map, insights')
        .eq('session_id', sessionId)
        .single();

    let strengthMap: StrengthMapItem[] = [];
    let summarySentence: string | null = null;
    let overallCounts: Record<string, number> = {};

    if (analysis) {
        strengthMap = (analysis.strength_map as StrengthMapItem[]) ?? [];

        const insights = analysis.insights as any;
        summarySentence = insights?.summary_sentence ?? null;
        overallCounts = insights?.overall_counts ?? {};

        // Recompute overall_counts from strength_map if missing
        if (Object.keys(overallCounts).length === 0 && strengthMap.length > 0) {
            strengthMap.forEach((item) => {
                overallCounts[item.mastery_state] =
                    (overallCounts[item.mastery_state] ?? 0) + 1;
            });
        }
    }

    return {
        props: {
            siteUrl,
            session: {
                id: session.id,
                title: session.title,
                depth_score: session.depth_score,
                created_at: session.created_at,
                conceptNames,
                strength_map: strengthMap,
                summary_sentence: summarySentence,
                overall_counts: overallCounts
            }
        }
    };
};
