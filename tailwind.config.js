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
                background: 'var(--bg)',
                surface: 'var(--surface)',
                border: 'var(--border)',
                text: 'var(--text)',
                muted: 'var(--muted)',
                accent: {
                    DEFAULT: 'var(--accent)',
                    light: 'var(--accent-light)'
                },
                shallow: {
                    DEFAULT: 'var(--shallow)',
                    light: 'var(--shallow-soft)'
                },
                missing: {
                    DEFAULT: 'var(--missing)',
                    light: 'var(--missing-soft)'
                },
                warn: {
                    DEFAULT: 'var(--warn)',
                    light: 'var(--warn-soft)'
                },
                dark: 'var(--dark)'
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
                display: ['"Instrument Serif"', 'serif'],
                serif: ['"Instrument Serif"', 'serif']
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
