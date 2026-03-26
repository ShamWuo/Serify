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
                    light: 'var(--accent-light)',
                    soft: 'var(--accent-soft)',
                },
                sage: {
                    DEFAULT: 'var(--sage)',
                    soft: 'var(--sage-soft)',
                },
                terracotta: {
                    DEFAULT: 'var(--terracotta)',
                    soft: 'var(--terracotta-soft)',
                },
                amber: {
                    DEFAULT: 'var(--amber)',
                    soft: 'var(--amber-soft)',
                },
                ink: 'var(--ink)',
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
                sans: ['"Space Grotesk"', 'sans-serif'],
                mono: ['"IBM Plex Mono"', 'monospace'],
                display: ['"Space Grotesk"', 'sans-serif'],
                serif: ['"Instrument Serif"', 'serif'],
                typewriter: ['"IBM Plex Mono"', 'monospace'],
            },
            boxShadow: {
                'hard': '4px 4px 0px var(--ink)',
                'hard-sm': '2px 2px 0px var(--ink)',
                'hard-lg': '6px 6px 0px var(--ink)',
                'hard-accent': '4px 4px 0px var(--accent)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s infinite',
                'sketch-draw': 'sketchDraw 1.8s ease-in-out infinite',
                'flicker': 'flicker 0.6s ease-out forwards',
                'ink-rise': 'inkRise 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'btn-sink': 'btnSink 0.12s ease-in-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out both',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                sketchDraw: {
                    '0%': { strokeDashoffset: '400', opacity: '0.3' },
                    '30%': { opacity: '1' },
                    '70%': { opacity: '1' },
                    '100%': { strokeDashoffset: '0', opacity: '0.3' }
                },
                flicker: {
                    '0%': { opacity: '1', transform: 'scale(1)' },
                    '25%': { opacity: '0.3', transform: 'scale(0.95)' },
                    '50%': { opacity: '0.8', transform: 'scale(1.05)' },
                    '75%': { opacity: '0.1', transform: 'scale(0.9)' },
                    '100%': { opacity: '0', transform: 'scale(0.7)' }
                },
                inkRise: {
                    '0%': { height: '0%' },
                    '100%': { height: 'var(--ink-level, 60%)' }
                },
                btnSink: {
                    '0%': { transform: 'translate(0, 0)', boxShadow: '4px 4px 0px var(--ink)' },
                    '50%': { transform: 'translate(2px, 2px)', boxShadow: '2px 2px 0px var(--ink)' },
                    '100%': { transform: 'translate(0, 0)', boxShadow: '4px 4px 0px var(--ink)' }
                }
            }
        }
    },
    plugins: []
};
