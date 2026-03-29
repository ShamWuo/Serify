const nextConfig = {
    reactStrictMode: true,

    // Reduces parallel prerender races on Windows / synced folders (OneDrive) where .next output can be incomplete mid-build.
    experimental: {
        staticGenerationMaxConcurrency: 1,
    },

    async headers() {
        return [
            // ... (existing headers)
        ];
    },

    async redirects() {
        return [
            {
                source: '/home',
                destination: '/',
                permanent: true,
            },
            {
                source: '/study',
                destination: '/practice',
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;
