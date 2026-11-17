import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Notice, Skeleton, Spinner } from '../../components/ui';

interface Row { id: string; account: string; keyword: string; location: string; result_count: number; status: string; note: string | null; created_at: string }

const BADGE: Record<string, string> = {
  complete: 'bg-moss-light text-moss-dark', partial: 'bg-warn-soft text-warn', empty: 'bg-danger-soft text-danger',
};

export default function ActivityTab() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { data, error: e } = await supabase.rpc('admin_recent_searches', { p_limit: 100 });
    if (e) setError(e.message); else { setRows(data as Row[]); setError(null); }
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (error) return <Notice n={{ kind: 'error', text: 'Could not load activity.', detail: `${error}. Run the latest supabase/schema.sql.` }} />;
  if (!rows) return <div className="space-y-2" aria-busy="true"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink/70">The 100 most recent searches across all customers. Lead details are not shown.</p>
        <button type="button" className="btn-outline" onClick={() => void load()} disabled={busy}>
          {busy ? <Spinner /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />} Refresh
        </button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Recent searches</caption>
          <thead className="border-b border-line bg-paper text-ink/70">
            <tr>{['When', 'Account', 'Search', 'Results', 'Outcome'].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5">{r.account}</td>
                <td className="px-4 py-2.5"><b>{r.keyword}</b> <span className="text-ink/60">in {r.location}</span></td>
                <td className="px-4 py-2.5">{r.result_count}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${BADGE[r.status] ?? 'bg-paper'}`}>{r.status}</span></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink/60">No searches yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
