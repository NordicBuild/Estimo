import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';
import { AppProfile } from '../hooks/useAppAuth';
import { Input, Button } from '../ui';

interface MinaUppgifterTabProps {
  user: User | null;
  profile: AppProfile | null;
  refreshProfile: () => Promise<void>;
}

export function MinaUppgifterTab({ user, profile, refreshProfile }: MinaUppgifterTabProps) {
  // Namn state
  const [name, setName] = useState('');
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // E-post state
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Lösenord state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
  }, [user]);

  const hasNameChanged = name !== (profile?.full_name || '');
  const hasEmailChanged = email !== (user?.email || '');
  
  const isPasswordValid = password.length >= 8 && password === confirmPassword;
  const hasPasswordInput = password.length > 0 || confirmPassword.length > 0;

  const handleSaveName = async () => {
    if (!user) return;
    setNameStatus('saving');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', user.id);
      
      if (error) throw error;
      
      await refreshProfile();
      setNameStatus('saved');
      setTimeout(() => setNameStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setNameStatus('error');
      setTimeout(() => setNameStatus('idle'), 3000);
    }
  };

  const handleSaveEmail = async () => {
    if (!user) return;
    setEmailStatus('saving');
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      
      setEmailStatus('saved');
      setTimeout(() => setEmailStatus('idle'), 5000); // Längre tid så användaren hinner läsa
    } catch (err) {
      console.error(err);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 3000);
    }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    setPasswordStatus('saving');
    setPasswordErrorMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setPasswordStatus('saved');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      setPasswordErrorMsg(err.message || 'Ett fel inträffade');
      setPasswordStatus('error');
    }
  };

  if (!user || !profile) {
    return (
      <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-on-surface mb-6">Mina uppgifter</h2>
        <div className="p-4 bg-surface rounded-xl border border-outline-variant text-on-surface-variant">
          Logga in för att se och redigera din profil.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-on-surface mb-8">Mina uppgifter</h2>

      <div className="flex flex-col gap-8 pb-16">
        {/* Namn-sektion */}
        <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-on-surface">Personuppgifter</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Ditt fullständiga namn och din roll.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Fullständigt namn
              </label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="För- och efternamn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Roll
              </label>
              <Input 
                value={profile.role === 'admin' ? 'Administratör' : 'Användare'} 
                disabled 
                className="bg-surface-container-low text-on-surface-variant cursor-not-allowed"
              />
              <p className="text-xs text-on-surface-variant mt-1">Rollen hanteras av administratör.</p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {nameStatus === 'saved' && <span className="text-sm font-medium text-status-success animate-fade-in">Sparat</span>}
              {nameStatus === 'error' && <span className="text-sm font-medium text-status-error animate-fade-in">Kunde inte spara</span>}
              <Button 
                onClick={handleSaveName} 
                disabled={!hasNameChanged || nameStatus === 'saving'}
                className="motion-reduce:transition-none"
              >
                {nameStatus === 'saving' ? 'Sparar...' : 'Spara ändringar'}
              </Button>
            </div>
          </div>
        </div>

        {/* E-post-sektion */}
        <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-on-surface">E-postadress</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Din inloggningsadress och kontaktmejl.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Nuvarande / Ny E-post
              </label>
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="namn@företag.se"
              />
            </div>

            {emailStatus === 'saved' && (
              <div className="p-3 bg-primary-container text-on-primary-container rounded-lg text-sm font-medium animate-fade-in">
                En bekräftelselänk har skickats till din nya e-postadress. Bytet träder i kraft först när du klickat på länken i mejlet.
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              {emailStatus === 'error' && <span className="text-sm font-medium text-status-error animate-fade-in">Kunde inte uppdatera e-post</span>}
              <Button 
                onClick={handleSaveEmail} 
                disabled={!hasEmailChanged || emailStatus === 'saving' || !email.includes('@')}
                className="motion-reduce:transition-none"
              >
                {emailStatus === 'saving' ? 'Skickar...' : 'Ändra e-post'}
              </Button>
            </div>
          </div>
        </div>

        {/* Lösenord-sektion */}
        <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-on-surface">Lösenord</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Uppdatera ditt lösenord (minst 8 tecken).
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Nytt lösenord
              </label>
              <Input 
                type="password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Bekräfta nytt lösenord
              </label>
              <Input 
                type="password"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>

            {hasPasswordInput && password.length > 0 && password.length < 8 && (
              <p className="text-xs text-status-error animate-fade-in">Lösenordet måste vara minst 8 tecken.</p>
            )}
            
            {hasPasswordInput && password.length >= 8 && password !== confirmPassword && confirmPassword.length > 0 && (
              <p className="text-xs text-status-error animate-fade-in">Lösenorden matchar inte.</p>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              {passwordStatus === 'saved' && <span className="text-sm font-medium text-status-success animate-fade-in">Lösenordet har ändrats</span>}
              {passwordStatus === 'error' && <span className="text-sm font-medium text-status-error animate-fade-in">{passwordErrorMsg || 'Kunde inte byta lösenord'}</span>}
              <Button 
                onClick={handleSavePassword} 
                disabled={!isPasswordValid || passwordStatus === 'saving'}
                className="motion-reduce:transition-none"
              >
                {passwordStatus === 'saving' ? 'Sparar...' : 'Byt lösenord'}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
