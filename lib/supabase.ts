import { createClient } from '@supabase/supabase-js';

const lockQueues: Record<string, Promise<unknown>> = {};
const alwaysQueueLock = async <T>(
    name: string,
    _acquireTimeout: number,
    fn: () => Promise<T>
): Promise<T> => {
    const prev = lockQueues[name] ?? Promise.resolve();
    let release!: () => void;
    lockQueues[name] = prev.then(
        () =>
            new Promise<void>((res) => {
                release = res;
            })
    );
    await prev;
    try {
        return await fn();
    } finally {
        release();
    }
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl) {
    throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable.\n' +
            'Please create a .env.local file in the root directory with:\n' +
            'NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
            'Get your Supabase URL from: https://app.supabase.com/project/_/settings/api'
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.\n' +
            'Please create a .env.local file in the root directory with:\n' +
            'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n' +
            'Get your Supabase anon key from: https://app.supabase.com/project/_/settings/api'
    );
}

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    throw new Error(
        `Invalid NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrl}"\n` +
            'The URL must start with http:// or https://\n' +
            'Example: https://your-project.supabase.co'
    );
}

const projectRef = supabaseUrl.includes('supabase.co')
    ? supabaseUrl.split('.')[0].split('//')[1]
    : 'local';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Supabase client initialized:', {
        url: supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        keyLength: supabaseAnonKey.length,
        keyPrefix: supabaseAnonKey.substring(0, 10) + '...'
    });

    if (!supabaseAnonKey.startsWith('eyJ')) {
        console.warn(
            '⚠️ WARNING: Supabase anon key does not appear to be a valid JWT token.\n' +
                'Valid Supabase keys typically start with "eyJ".\n' +
                'Please verify your NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        );
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
        storageKey: `sb-${projectRef}-auth-token`,
        flowType: 'pkce',
        lock: alwaysQueueLock
    }
});
