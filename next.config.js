const nextConfig = {
    reactStrictMode: true,

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
        ];
    },
};

module.exports = nextConfig;
