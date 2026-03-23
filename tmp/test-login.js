import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testLogin() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test-user-10k@serify.app',
        password: 'Password123'
    });

    if (error) {
        console.error('Login failed:', error.message);
    } else {
        console.log('Login successful! User ID:', data.user.id);
    }
}

testLogin();
