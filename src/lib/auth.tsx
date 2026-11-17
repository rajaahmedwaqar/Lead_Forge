import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ADMIN_EMAIL_DOMAIN } from './constants';
import type { Profile } from '../types';

type EditableProfile = Pick<Profile,
  'display_name' | 'company' | 'sender_name' | 'email_subject_template' | 'email_body_template'>;

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  suspended: boolean;
  signIn: (idOrEmail: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  saveProfile: (patch: Partial<EditableProfile>) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

/** "admin123" -> reserved internal address; anything with an @ is used as typed. */
export function loginEmail(idOrEmail: string): string {
  const v = idOrEmail.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${ADMIN_EMAIL_DOMAIN}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false); // saved session restored from storage
  const [loadedFor, setLoadedFor] = useState<string | null>(null); // user id whose profile has been fetched
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Load the profile (which carries the role) whenever the signed-in user changes.
  // Done in an effect, not inside onAuthStateChange, to avoid Supabase client deadlocks.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setProfile(null); setLoadedFor(null); return; }
    void supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error('[LeadForge] load profile', error);
      const p = (data as Profile | null) ?? null;
      if (p && !p.is_active) { setSuspended(true); void supabase.auth.signOut(); setProfile(null); }
      else { setProfile(p); setSuspended(false); }
      setLoadedFor(userId);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const loading = !ready || (!!userId && loadedFor !== userId);

  const signIn = useCallback(async (idOrEmail: string, password: string) => {
    setSuspended(false);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(idOrEmail), password });
    if (error) {
      throw new Error(/invalid login/i.test(error.message) ? 'Incorrect ID/email or password.' : error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (email.trim().toLowerCase().endsWith(`@${ADMIN_EMAIL_DOMAIN}`)) throw new Error('That email address is reserved.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password, options: { data: { display_name: name.trim() } },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const saveProfile = useCallback(async (patch: Partial<EditableProfile>) => {
    if (!userId) throw new Error('Not signed in.');
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) throw new Error(error.message);
    setProfile((p) => (p ? { ...p, ...patch } : p));
  }, [userId]);

  const value = useMemo(
    () => ({ session, profile, loading, suspended, signIn, signUp, signOut, saveProfile }),
    [session, profile, loading, suspended, signIn, signUp, signOut, saveProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
