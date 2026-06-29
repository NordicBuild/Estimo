import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, loginWithGoogle, logout } from '../supabase';

export interface AppProfile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'user' | 'viewer' | null;
  company_id: string | null;
}

export function useAppAuth(
  initialAppMode: 'kalkyl' | 'admin',
  setAppMode: (mode: 'kalkyl' | 'admin') => void
) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualLoginError, setManualLoginError] = useState('');
  const [loginMode, setLoginMode] = useState<'kalkyl' | 'admin'>(initialAppMode);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchProfileForUser = async (sessionUser: User | null) => {
    setProfileLoading(true);
    if (!sessionUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, company_id')
        .eq('id', sessionUser.id)
        .single();
      
      if (error) {
        console.error('profiles fetch', error);
        setProfileError(error.message);
      } else if (!data) {
        setProfileError('Ingen profilrad hittades för användaren');
      }
      
      if (data) {
        setProfile(data as AppProfile);
        setProfileError(null);
        // Låt App.tsx hantera behörighetskontroll, tvinga inte appMode här
      } else {
        setProfile(null);
      }
    } catch (e: any) {
      console.error('profiles fetch', e);
      setProfileError(e.message || 'Ett okänt fel inträffade vid hämtning av profil');
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetchProfileForUser(session?.user ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      fetchProfileForUser(sessionUser).finally(() => {
        setAuthInitialized(true);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      fetchProfileForUser(sessionUser).finally(() => {
        setAuthInitialized(true);
      });
      if (session?.user && window.opener && window.opener !== window) {
         window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
         window.close();
      }
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          const sessionUser = session?.user ?? null;
          setUser(sessionUser);
          fetchProfileForUser(sessionUser).finally(() => {
            setAuthInitialized(true);
          });
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoginError('Hämtar användare...');
    setAppMode(loginMode);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: manualEmail,
      password: manualPassword
    });

    if (error) {
      let swedishError = 'Ett fel inträffade vid inloggning.';
      if (error.message.includes('Invalid login credentials')) {
        swedishError = 'Felaktigt användarnamn eller lösenord.';
      } else if (error.message.includes('Email not confirmed')) {
        swedishError = 'E-postadressen är inte bekräftad.';
      } else {
        swedishError = 'Inloggningsfel: ' + error.message;
      }
      setManualLoginError(swedishError);
    } else {
      setManualLoginError('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setProfile(null);
  };

  const role = profile?.role ?? null;
  const isAdmin = role === 'admin';

  return {
    user,
    profile,
    profileLoading,
    profileError,
    role,
    isAdmin,
    refreshProfile,
    authInitialized,
    manualEmail,
    setManualEmail,
    manualPassword,
    setManualPassword,
    manualLoginError,
    setManualLoginError,
    loginMode,
    setLoginMode,
    handleManualLogin,
    handleLogout,
    loginWithGoogle
  };
}
