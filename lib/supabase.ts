import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/db_types_new';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Debug logging
if (typeof window !== 'undefined') {
    console.log('[Supabase Init] URL exists:', !!supabaseUrl, 'Key exists:', !!supabaseAnonKey);
}

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

/**
 * A custom lock implementation that avoids the NavigatorLockAcquireTimeoutError.
 *
 * The default Supabase auth uses the Web Locks API (navigator.locks) to serialize
 * token refresh operations across browser tabs. This causes a 10-second timeout
 * error when too many requests compete for the lock simultaneously (e.g., during
 * Next.js HMR with multiple component mounts).
 *
 * This implementation uses a simple Promise-based mutex (in-memory queue) that
 * prevents concurrent token refreshes within the same tab, without relying on
 * the browser's navigator.locks which can time out.
 *
 * LockFunc type: <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>
 */
function createInMemoryLock() {
    const mutexMap = new Map<string, Promise<void>>();

    return async function lock<R>(
        name: string,
        _acquireTimeout: number,
        fn: () => Promise<R>
    ): Promise<R> {
        // Chain onto the existing promise for this lock name, ensuring serialization
        const current = mutexMap.get(name) ?? Promise.resolve();
        let resolveNext!: () => void;
        const next = new Promise<void>((resolve) => { resolveNext = resolve; });
        mutexMap.set(name, next);

        // Wait our turn
        await current;
        try {
            return await fn();
        } finally {
            resolveNext();
            // Clean up if nothing else is waiting
            if (mutexMap.get(name) === next) {
                mutexMap.delete(name);
            }
        }
    };
}

const createSupabaseClient = () => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true,
            storageKey: `sb-${projectRef}-auth-token`,
            flowType: 'pkce',
            // Use in-memory lock instead of navigator.locks to prevent timeout errors
            // See: https://github.com/supabase/gotrue-js/issues/808
            lock: createInMemoryLock(),
        },
    });
};

// ---------------------------------------------------------------------------
// TRUE singleton: use a global symbol so that module re-evaluation during
// Next.js Fast Refresh / HMR doesn't create a second client instance.
// This is the pattern recommended by Supabase for Next.js apps.
// ---------------------------------------------------------------------------
declare global {
    // eslint-disable-next-line no-var
    var __supabaseClient: SupabaseClient | undefined;
}

export const supabase: SupabaseClient = (() => {
    if (typeof window === 'undefined') {
        // Server: create a fresh client each time (no shared state between requests)
        return createSupabaseClient();
    }
    // Browser: strict singleton — reuse across HMR / Fast Refresh
    if (!globalThis.__supabaseClient) {
        console.log('[Supabase] Creating new client instance');
        globalThis.__supabaseClient = createSupabaseClient();
        console.log('[Supabase] Client created successfully');
    }
    return globalThis.__supabaseClient;
})();

// ---------------------------------------------------------------------------
// Admin client — server-side only, bypasses RLS.
// Always stateless (no session persistence).
// ---------------------------------------------------------------------------
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
    ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;
