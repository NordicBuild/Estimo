import React, { useState, useEffect } from 'react';
import { supabase, logout } from '../supabase';
import { User } from '@supabase/supabase-js';
import { AppProfile } from '../hooks/useAppAuth';
import { Input, Button, Badge } from '../ui';

interface MinaUppgifterTabProps {
  user: User | null;
  profile: AppProfile | null;
  refreshProfile: () => Promise<void>;
}

export function MinaUppgifterTab({ user, profile, refreshProfile }: MinaUppgifterTabProps) {
  // Profil state
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [personStatus, setPersonStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // E-post state
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Lösenord state
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setTitle(profile.title || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
  }, [user]);

  const hasPersonChanged = name !== (profile?.full_name || '') || title !== (profile?.title || '') || phone !== (profile?.phone || '');
  const hasEmailChanged = email !== (user?.email || '');
  
  const isPasswordValid = password.length >= 8 && password === confirmPassword;
  const hasPasswordInput = password.length > 0 || confirmPassword.length > 0;

  const handleSavePerson = async () => {
    if (!user) return;
    setPersonStatus('saving');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: name, title, phone })
        .eq('id', user.id)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Saknar behörighet att uppdatera profilen (RLS).');
      
      await refreshProfile();
      setPersonStatus('saved');
      setTimeout(() => setPersonStatus('idle'), 3000);
    } catch (err) {
      // warning removed
      setPersonStatus('error');
      setTimeout(() => setPersonStatus('idle'), 3000);
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
      // warning removed
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 3000);
    }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    setPasswordStatus('saving');
    setPasswordErrorMsg('');
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email!, password: currentPassword,
      });

      if (reauthError) {
        setPasswordErrorMsg('Fel nuvarande lösenord.');
        setPasswordStatus('error');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setPasswordStatus('saved');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (err: any) {
      // warning removed
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
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-on-surface">Personuppgifter</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Ditt fullständiga namn och din roll.
            </p>
          </div>
           <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Telefon
                </label>
                <Input 
                  type="tel"
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="070-123 45 67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Befattning
                </label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="t.ex. Kalkylator"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Roll
                </label>
                <Input 
                  value={profile.role === 'admin' ? 'Administratör' : profile.role === 'manager' ? 'Projektledare' : profile.role === 'viewer' ? 'Läsbehörighet' : 'Användare'} 
                  disabled 
                  className="bg-surface-container-low text-on-surface-variant cursor-not-allowed"
                />
                <p className="text-xs text-on-surface-variant mt-1">Rollen hanteras av administratör.</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {personStatus === 'saved' && <span className="text-sm font-medium text-status-success animate-fade-in">Sparat</span>}
              {personStatus === 'error' && <span className="text-sm font-medium text-status-error animate-fade-in">Kunde inte spara</span>}
              <Button 
                onClick={handleSavePerson} 
                disabled={!hasPersonChanged || personStatus === 'saving'}
                className="motion-reduce:transition-none"
              >
                {personStatus === 'saving' ? 'Sparar...' : 'Spara ändringar'}
              </Button>
            </div>
          </div>
        </div>

        {/* E-post-sektion */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-on-surface">E-postadress</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Din inloggningsadress och kontaktmejl.
            </p>
          </div>
          
          <div className="p-6 space-y-4">
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
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-on-surface">Lösenord</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Uppdatera ditt lösenord (minst 8 tecken).
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Nuvarande lösenord
              </label>
              <Input 
                type="password"
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
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
                disabled={!isPasswordValid || passwordStatus === 'saving' || currentPassword.length === 0}
                className="motion-reduce:transition-none"
              >
                {passwordStatus === 'saving' ? 'Sparar...' : 'Byt lösenord'}
              </Button>
            </div>
          </div>
        </div>

        {/* Konto-sektion */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-on-surface">Konto</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Din behörighet och inloggningshistorik.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Roll / Behörighet
                </label>
                <div>
                  <Badge variant={profile?.role === 'admin' ? 'purple' : profile?.role === 'manager' ? 'blue' : 'gray'}>
                    {profile?.role === 'admin' ? 'Administratör' : 
                     profile?.role === 'manager' ? 'Projektledare' : 
                     profile?.role === 'viewer' ? 'Läsbehörighet' : 'Användare'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Medlem sedan
                </label>
                <p className="text-sm text-on-surface-variant">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('sv-SE') : '–'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Senast inloggad
                </label>
                <p className="text-sm text-on-surface-variant">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('sv-SE') : '–'}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-2 border-t border-outline-variant flex justify-end">
              <Button 
                variant="danger" 
                icon="logout"
                onClick={async () => {
                  await logout();
                }}
              >
                Logga ut
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
