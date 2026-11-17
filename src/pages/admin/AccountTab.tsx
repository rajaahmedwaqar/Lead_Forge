import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Spinner, useToast } from '../../components/ui';

export default function AccountTab() {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 12) { toast({ kind: 'error', text: 'Use at least 12 characters.' }); return; }
    if (pw !== pw2) { toast({ kind: 'error', text: 'The two passwords do not match.' }); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast({ kind: 'error', text: 'Could not change the password.', detail: error.message });
    else { setPw(''); setPw2(''); toast({ kind: 'ok', text: 'Password changed.' }); }
  };

  return (
    <form onSubmit={(e) => void save(e)} className="card max-w-xl space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-extrabold">Change admin password</h2>
        <p className="mt-1 text-sm text-ink/70">The password is stored hashed by Supabase Auth. It is never kept in the app or its code.</p>
      </div>
      <div>
        <label htmlFor="npw" className="label">New password</label>
        <input id="npw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={12} required />
      </div>
      <div>
        <label htmlFor="npw2" className="label">Repeat new password</label>
        <input id="npw2" type="password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" minLength={12} required />
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner />} Change password</button>
    </form>
  );
}
