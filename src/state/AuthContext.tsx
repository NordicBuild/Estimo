import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  authInitialized: boolean;
  appMode: 'kalkyl' | 'admin';
  setAppMode: (mode: 'kalkyl' | 'admin') => void;
  // include other auth functions if necessary, but let's keep it complete
  manualEmail: string;
  setManualEmail: (val: string) => void;
  manualPassword: string;
  setManualPassword: (val: string) => void;
  manualLoginError: string;
  setManualLoginError: (val: string) => void;
  loginMode: 'kalkyl' | 'admin';
  setLoginMode: (val: 'kalkyl' | 'admin') => void;
  handleManualLogin: (e: React.FormEvent) => Promise<void>;
  handleLogout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, value }: { children: ReactNode, value: AuthContextType }) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
