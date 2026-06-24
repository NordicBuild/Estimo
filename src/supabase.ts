/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.example.com';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const logout = async () => {
  localStorage.removeItem('betong_mock_user');
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Logout failed", error);
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
    console.error("Login with Google failed", error);
  }
};
