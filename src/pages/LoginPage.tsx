import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { configError } from '../lib/supabase';
import { useSeo } from '../lib/seo';
import { Logo, Notice, Spinner, ThemeToggle } from '../components/ui';
import type { NoticeData } from '../components/ui';

export default function LoginPage() {
  useSeo({ title: 'Sign in | LeadForge', description: 'Sign in to your LeadForge account.', noindex: true });
  const { profile, loading, suspended, signIn, signUp } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<NoticeData | null>(null);

  useEffect(() => {
    if (suspended) setNote({ kind: 'error', text: 'This account has been suspended. Contact the administrator.' });
  }, [suspended]);

  if (!loading && profile) return <Navigate to={profile.role === 'admin' ? '/admin' : '/app'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      if (mode === 'signin') {
        await signIn(id, password);
        navigate('/app', { replace: true }); // the role guard forwards admins to /admin
      } else {
        if (password.length < 8) throw new Error('Use a password of at least 8 characters.');
        const r = await signUp(id, password, name);
        if (r.needsConfirmation) {
          setNote({ kind: 'ok', text: 'Account created. Check your email to confirm it, then sign in.' });
          setMode('signin');
        } else navigate('/app', { replace: true });
      }
    } catch (err) {
      setNote({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const signup = mode === 'signup';
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" aria-label="LeadForge home"><Logo /></Link>
          <ThemeToggle />
        </div>
        <main className="card animate-fade-up p-6">
          <h1 className="text-2xl font-extrabold">{signup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {signup ? 'Start finding local business leads.' : 'Sign in with your email, or the admin ID.'}
          </p>

          <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-4">
            {configError && <Notice n={{ kind: 'error', text: configError }} />}
            {signup && (
              <div>
                <label htmlFor="name" className="label">Your name</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)}
                  autoComplete="name" maxLength={80} required />
              </div>
            )}
            <div>
              <label htmlFor="id" className="label">{signup ? 'Email' : 'Email or admin ID'}</label>
              <input id="id" className="input" value={id} onChange={(e) => setId(e.target.value)}
                type={signup ? 'email' : 'text'} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required />
            </div>
            <Notice n={note} />
            <button type="submit" className="btn-primary w-full" disabled={busy || !!configError}>
              {busy && <Spinner />} {signup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/70">
            {signup ? 'Already have an account?' : 'New to LeadForge?'}{' '}
            <button type="button" className="font-bold text-moss underline"
              onClick={() => { setMode(signup ? 'signin' : 'signup'); setNote(null); }}>
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </main>
      </div>
    </div>
  );
}
