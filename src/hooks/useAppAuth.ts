import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, loginWithGoogle, logout } from '../supabase';

export function useAppAuth(
  initialAppMode: 'kalkyl' | 'admin',
  setAppMode: (mode: 'kalkyl' | 'admin') => void
) {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualLoginError, setManualLoginError] = useState('');
  const [loginMode, setLoginMode] = useState<'kalkyl' | 'admin'>('kalkyl');

  const updateRoleAndMode = async (sessionUser: User | null) => {
    if (!sessionUser) {
      setAppMode('kalkyl');
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .single();
      
      if (data && data.role === 'admin') {
        setAppMode('admin');
      } else {
        setAppMode('kalkyl');
      }
    } catch (e) {
      setAppMode('kalkyl');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      updateRoleAndMode(sessionUser).finally(() => {
        setAuthInitialized(true);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      updateRoleAndMode(sessionUser).finally(() => {
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
          updateRoleAndMode(sessionUser).finally(() => {
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
      }
      setManualLoginError(swedishError);
    } else {
      setManualLoginError('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return {
    user,
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
