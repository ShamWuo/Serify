import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/db_types_new'; // Correct path for DB types

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

// Custom fetch wrapper to handle timeouts
const fetchWithTimeout = async (url: string | URL | Request, options?: RequestInit) => {
    const timeout = 15000; // 15 second timeout for auth/DB calls
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// Singleton pattern to prevent multiple instances during Fast Refresh
const createSupabaseClient = () => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true,
            storageKey: `sb-${projectRef}-auth-token`,
            flowType: 'pkce'
        },
        global: {
            fetch: fetchWithTimeout
        }
    });
};

const globalForSupabase = globalThis as unknown as {
    supabase: ReturnType<typeof createSupabaseClient> | undefined;
};

export const supabase = globalForSupabase.supabase ?? createSupabaseClient();

// Admin client for server-side operations that need to bypass RLS
// We only initialize this if the SUPABASE_SERVICE_ROLE_KEY is present
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
    ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

if (process.env.NODE_ENV !== 'production') {
    globalForSupabase.supabase = supabase;
}

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
