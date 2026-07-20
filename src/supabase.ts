/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.example.com';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key';

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || err.message === 'Load failed' || err.message?.includes('fetch') || err.message?.includes('Load')) {
       console.warn('Supabase fetch failed silently (likely unconfigured URL).');
       return new Response(JSON.stringify({ error: err.message }), {
         status: 500,
         statusText: 'Failed to fetch',
         headers: { 'Content-Type': 'application/json' }
       });
    }
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});

export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    // warning removed
  }
};

export const loginWithGoogle = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (error) {
    // warning removed
  }
};


export async function saveProjectsToSupabase(
  projects: any[], 
  companyId: string,
  userId: string
): Promise<boolean> {
  if (!companyId) return false;
  if (supabaseUrl === 'https://supabase.example.com') return true;
  try {
    const { error } = await supabase.from('app_state').upsert({
      id: `projects_${companyId}`,
      company_id: companyId,
      data: projects
    });
    if (error) {
      // console.error('Failed to sync projects to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing projects to Supabase:', err);
    return false;
  }
}

export async function saveFoldersToSupabase(
  folders: any[], 
  companyId: string,
  userId: string
): Promise<boolean> {
  if (!companyId) return false;
  if (supabaseUrl === 'https://supabase.example.com') return true;
  try {
    const { error } = await supabase.from('app_state').upsert({
      id: `folders_${companyId}`,
      company_id: companyId,
      data: folders
    });
    if (error) {
      // console.error('Failed to sync folders to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception syncing folders to Supabase:', err);
    return false;
  }
}
