import Head from 'next/head';
import { useRouter } from 'next/router';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    article?: boolean;
}

const SEO = ({ title, description, image, article }: SEOProps) => {
    const router = useRouter();
    const defaultTitle = 'Serify | Context-Aware Learning Reflection Engine';
    const defaultDescription = 'Serify move beyond simple testing. It analyzes content you consume and generates intelligent, scenario-based questions to map conceptual understanding, identify misconceptions, and target the "illusion of competence."';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://serify.ai';
    const defaultImage = `${siteUrl}/og-image.png`;

    const seo = {
        title: title ? `${title} | Serify` : defaultTitle,
        description: description || defaultDescription,
        image: image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : defaultImage,
        url: `${siteUrl}${router.asPath === '/' ? '' : router.asPath}`,
    };

    return (
        <Head>
            <title>{seo.title}</title>
            <meta name="description" content={seo.description} />
            <meta name="image" content={seo.image} />
            <link rel="canonical" href={seo.url} />

            {seo.url && <meta property="og:url" content={seo.url} />}
            {(article ? true : null) && <meta property="og:type" content="article" />}
            {seo.title && <meta property="og:title" content={seo.title} />}
            {seo.description && (
                <meta property="og:description" content={seo.description} />
            )}
            {seo.image && <meta property="og:image" content={seo.image} />}

            <meta name="twitter:card" content="summary_large_image" />
            {seo.title && <meta name="twitter:title" content={seo.title} />}
            {seo.description && (
                <meta name="twitter:description" content={seo.description} />
            )}
            {seo.image && <meta name="twitter:image" content={seo.image} />}

            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            <meta name="theme-color" content="#10b981" />
            <link rel="icon" href="/favicon.ico" />
        </Head>
    );
};

export default SEO;
