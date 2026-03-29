import type { GetServerSideProps } from 'next';

/** Legacy URL: `/sessions` redirects to `/history`. */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const q = ctx.resolvedUrl.includes('?') ? ctx.resolvedUrl.slice(ctx.resolvedUrl.indexOf('?')) : '';
    return {
        redirect: {
            destination: `/history${q}`,
            permanent: false
        }
    };
};

export default function SessionsLegacyRedirect() {
    return null;
}
