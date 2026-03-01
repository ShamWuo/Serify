import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function KnowledgeMapRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/vault');
    }, [router]);
    return null;
}
