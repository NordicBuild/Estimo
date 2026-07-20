import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function test() {
  const { data, error } = await supabase.rpc('get_policies'); // won't work, maybe just do a manual query
}
test();
