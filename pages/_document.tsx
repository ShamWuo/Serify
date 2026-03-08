import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Instrument+Serif:ital@0;1&display=swap"
                    rel="stylesheet"
                />

                {/* Brand Identity & Favicons */}
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/logo.png" type="image/png" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <meta name="theme-color" content="#6366f1" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
