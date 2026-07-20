import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key) acc[key] = val.join('=');
  return acc;
}, {} as Record<string, string>);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('project_documents').insert({
    project_id: 'test',
    filename: '.keep',
    document_type: 'folder',
    file_path: 'test/.keep'
  }).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
