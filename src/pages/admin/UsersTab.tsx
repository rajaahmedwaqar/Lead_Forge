import { useMemo, useState } from 'react';
import { Eraser, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmDialog, Switch, Tooltip, useToast } from '../../components/ui';
import type { AdminUser, Overview } from './types';

type Action = { kind: 'wipe' | 'delete'; user: AdminUser } | { kind: 'claim' } | null;

export default function UsersTab({ data, reload }: { data: Overview; reload: () => Promise<void> }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [claimFor, setClaimFor] = useState('');

  const customers = useMemo(() => data.users.filter((u) => u.role === 'customer'), [data.users]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.users.filter((u) => !t || `${u.name ?? ''} ${u.login}`.toLowerCase().includes(t));
  }, [data.users, q]);
  const legacyTotal = data.legacy.searches + data.legacy.leads + data.legacy.services;

  const setActive = async (u: AdminUser) => {
    const { error } = await supabase.rpc('admin_set_user_active', { p_user: u.id, p_active: !u.is_active });
    if (error) toast({ kind: 'error', text: 'Could not update the user.', detail: error.message });
    else { toast({ kind: 'ok', text: `${u.login} ${u.is_active ? 'suspended' : 'reactivated'}.` }); await reload(); }
  };

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    let err: string | undefined;
    let done = '';
    if (action.kind === 'wipe') {
      const { data: r, error } = await supabase.rpc('admin_wipe_user_data', { p_user: action.user.id });
      err = error?.message;
      const x = r as { searches_deleted: number; leads_deleted: number } | null;
      done = `Cleared ${x?.searches_deleted ?? 0} searches and ${x?.leads_deleted ?? 0} leads.`;
    } else if (action.kind === 'delete') {
      const { error } = await supabase.rpc('admin_delete_user', { p_user: action.user.id });
      err = error?.message;
      done = `${action.user.login} was deleted.`;
    } else {
      const { data: r, error } = await supabase.rpc('admin_claim_legacy', { p_user: claimFor });
      err = error?.message;
      const x = r as { searches: number; leads: number; services: number } | null;
      done = `Assigned ${x?.searches ?? 0} searches, ${x?.leads ?? 0} leads and ${x?.services ?? 0} services.`;
    }
    setBusy(false);
    setAction(null);
    if (err) toast({ kind: 'error', text: 'The action failed.', detail: err });
    else { toast({ kind: 'ok', text: done }); await reload(); }
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="usersearch" className="sr-only">Search accounts</label>
        <input id="usersearch" className="input sm:max-w-sm" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Accounts</caption>
          <thead className="border-b border-line bg-paper text-ink/70">
            <tr>{['Account', 'Joined', 'Last sign-in', 'Searches', 'Leads', 'Active', 'Actions'].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">
                  <div className="font-bold">{u.name || u.login}</div>
                  <div className="text-xs text-ink/60">{u.login}{u.role === 'admin' && <span className="ml-2 rounded bg-warn-soft px-1.5 py-0.5 font-bold text-warn">admin</span>}</div>
                </td>
                <td className="px-4 py-2.5">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'never'}</td>
                <td className="px-4 py-2.5">{u.searches}</td>
                <td className="px-4 py-2.5">{u.leads}</td>
                <td className="px-4 py-2.5">
                  {u.role === 'admin' ? <span className="text-ink/50">always</span>
                    : <Switch checked={u.is_active} label={`${u.login} is ${u.is_active ? 'active' : 'suspended'}`} onChange={() => void setActive(u)} />}
                </td>
                <td className="px-4 py-2.5">
                  {u.role === 'customer' && (
                    <div className="flex gap-1">
                      <Tooltip text="Clear their searches and leads">
                        <button type="button" aria-label={`Clear data of ${u.login}`} onClick={() => setAction({ kind: 'wipe', user: u })} className="btn-ghost h-9 w-9 !min-h-0 !px-0"><Eraser className="h-4 w-4" /></button>
                      </Tooltip>
                      <Tooltip text="Delete account">
                        <button type="button" aria-label={`Delete ${u.login}`} onClick={() => setAction({ kind: 'delete', user: u })} className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger-soft"><Trash2 className="h-4 w-4" /></button>
                      </Tooltip>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="px-4 py-6 text-center text-ink/60">No accounts match.</td></tr>}
          </tbody>
        </table>
      </div>

      {legacyTotal > 0 && (
        <section className="card space-y-3 p-4" aria-labelledby="legacy">
          <h2 id="legacy" className="font-extrabold">Earlier data from before accounts existed</h2>
          <p className="text-sm text-ink/70">
            {data.legacy.searches} searches, {data.legacy.leads} leads and {data.legacy.services} services were saved before sign-in was added.
            They stay hidden until you assign them to a customer.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="claim" className="sr-only">Assign to account</label>
            <select id="claim" className="input sm:max-w-xs" value={claimFor} onChange={(e) => setClaimFor(e.target.value)}>
              <option value="">Choose a customer...</option>
              {customers.map((u) => <option key={u.id} value={u.id}>{u.name || u.login} ({u.login})</option>)}
            </select>
            <button type="button" className="btn-primary" disabled={!claimFor} onClick={() => setAction({ kind: 'claim' })}>Assign data</button>
          </div>
        </section>
      )}

      <ConfirmDialog open={!!action} busy={busy} onCancel={() => setAction(null)} onConfirm={() => void confirm()}
        title={action?.kind === 'delete' ? 'Delete this account?' : action?.kind === 'wipe' ? 'Clear this customer\'s data?' : 'Assign earlier data?'}
        confirmLabel={action?.kind === 'delete' ? 'Delete account' : action?.kind === 'wipe' ? 'Clear data' : 'Assign'}
        body={action?.kind === 'delete'
          ? <><b>{action.user.login}</b> will be removed together with {action.user.searches} searches, {action.user.leads} leads and their services. This cannot be undone.</>
          : action?.kind === 'wipe'
            ? <>All searches, leads and services of <b>{action.user.login}</b> are deleted. The account stays and can sign in. This cannot be undone.</>
            : 'All earlier searches, leads and services move to the selected account. Leads the account already has are left untouched.'} />
    </div>
  );
}
