module.exports = {
    darkMode: 'class',
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}'
    ],
    theme: {
        extend: {
            colors: {
                background: '#F7F6F2',
                surface: '#FFFFFF',
                border: '#E8E6DF',
                text: '#1A1916',
                muted: '#8C8880',
                accent: {
                    DEFAULT: '#2A5C45',
                    light: '#EAF2EE'
                },
                shallow: {
                    DEFAULT: '#B8860B',
                    light: '#FDF8E8'
                },
                missing: {
                    DEFAULT: '#7C3D9E',
                    light: '#F5EEFA'
                },
                warn: {
                    DEFAULT: '#C4541A',
                    light: '#FDF0E8'
                },
                dark: '#1A1916'
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
                display: ['"Instrument Serif"', 'serif']
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s infinite'
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                }
            }
        }
    },
    plugins: []
};
