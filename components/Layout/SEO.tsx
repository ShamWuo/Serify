import Head from 'next/head';
import { useRouter } from 'next/router';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    article?: boolean;
    keywords?: string;
    robots?: string;
}

const SEO = ({ title, description, image, article, keywords, robots }: SEOProps) => {
    const router = useRouter();
    const defaultTitle = 'Serify | Context-Aware Learning Reflection Engine';
    const defaultDescription = 'Serify moves beyond simple testing. It analyzes content you consume and generates intelligent, scenario-based questions to map conceptual understanding, identify misconceptions, and target the "illusion of competence."';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://serify.study';
    const defaultImage = `${siteUrl}/og-image.png`;
    const defaultKeywords = 'learning, reflection, ai education, educational technology, context-aware, metacognition';
    const defaultRobots = 'index, follow';

    const seo = {
        title: title ? `${title} | Serify` : defaultTitle,
        description: description || defaultDescription,
        image: image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : defaultImage,
        url: `${siteUrl}${router.asPath === '/' ? '' : router.asPath}`,
        keywords: keywords || 'active recall, ai tutor, cognitive diagnostic, knowledge mapping, learning science, spaced repetition, misconception detection, serify',
        robots: robots || defaultRobots,
    };

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Serify',
        operatingSystem: 'Any',
        applicationCategory: 'EducationApplication',
        url: siteUrl,
        description: defaultDescription,
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        featureList: 'Context-Aware AI, Active Recall, Knowledge Mapping, Misconception Detection',
    };

    return (
        <Head>
            <title key="title">{seo.title}</title>
            <meta key="description" name="description" content={seo.description} />
            <meta key="image" name="image" content={seo.image} />
            <meta key="keywords" name="keywords" content={seo.keywords} />
            <meta key="robots" name="robots" content={seo.robots} />
            <link key="canonical" rel="canonical" href={seo.url} />

            {seo.url && <meta key="og:url" property="og:url" content={seo.url} />}
            {article && <meta key="og:type" property="og:type" content="article" />}
            <meta key="og:title" property="og:title" content={seo.title} />
            <meta key="og:description" property="og:description" content={seo.description} />
            <meta key="og:image" property="og:image" content={seo.image} />

            <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
            <meta key="twitter:title" name="twitter:title" content={seo.title} />
            <meta key="twitter:description" name="twitter:description" content={seo.description} />
            <meta key="twitter:image" name="twitter:image" content={seo.image} />

            <meta key="theme-color" name="theme-color" content="#10b981" />
            
            <script
                key="structured-data"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
        </Head>
    );
};

export default SEO;
