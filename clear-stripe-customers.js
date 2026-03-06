const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStripeCustomers() {
    console.log('Clearing Stripe customer IDs...');
    const { data, error } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: null })
        .not('stripe_customer_id', 'is', null)
        .select('id, email, stripe_customer_id');

    if (error) {
        console.error('Error clearing customer IDs:', error);
    } else {
        console.log('Success! Cleared customer IDs for profiles:', data.length);
    }
}

resetStripeCustomers();
