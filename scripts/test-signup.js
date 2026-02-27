const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
    const email = `test-${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`Attempting signup for ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: 'Diagnostic Test'
            }
        }
    });

    if (error) {
        console.error('SIGNUP ERROR:', error);
        console.error('STATUS:', error.status);
        console.error('MESSAGE:', error.message);
    } else {
        console.log('SIGNUP SUCCESS:', data.user.id);
    }
}

testSignup();
