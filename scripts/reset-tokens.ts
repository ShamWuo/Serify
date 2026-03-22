import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing config');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
  const { data: user } = await supabase.from('users').select('id, email').eq('email', 'test-user-10k@serify.app').single();
  if (user) {
    const { data, error } = await supabase.from('user_usage')
      .update({ tokens_used: 0, monthly_limit: 100000 })
      .eq('user_id', user.id)
      .select();
    console.log('Reset usage for user', user.email, 'to 0 tokens:', error ? error : 'Success');
  } else {
    console.log('User not found');
  }
  process.exit(0);
}

reset();
