const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Starting schema repair...');
    // Try to check if we have the SQL RPC
    const { data: rpcs, error: rpcError } = await supabase.rpc('execute_sql', {
        query: "ALTER TABLE public.practice_responses ADD COLUMN IF NOT EXISTS concept_id UUID REFERENCES public.knowledge_nodes(id);"
    }).catch(e => ({ error: e }));

    if (rpcError) {
        console.error('Schema repair failed - RPC likely missing or permission denied');
        console.error(rpcError);
    } else {
        console.log('Schema repair successful');
    }
}
run();
